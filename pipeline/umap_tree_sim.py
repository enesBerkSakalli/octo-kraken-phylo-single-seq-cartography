from dendropy.simulate import treesim
import numpy as np
import math

from advanced_tree_parser_util import (
    write_pair_bracket_string_to_json,
    convert_pair_bracket_string_to_json,
)


def index_leaves(node, index=0):
    """
    Recursively assigns an index to each leaf node in the tree.

    Args:
    - node: The current node in the tree.
    - index: The current index to assign to a leaf node.

    Returns:
    - The next index to use for subsequent nodes.
    """
    # Base case: If the node is a leaf, assign it the current index
    if "children" not in node:
        node["index"] = index
        return index + 1  # Return the next index for the next leaf

    # Recursive case: The node is not a leaf, so recurse on its children
    for child in node["children"]:
        index = index_leaves(
            child, index
        )  # Update the index based on the child's indexing

    return index  # Return the updated index after processing all children


def create_equal_segments_with_bins(total_count, num_bins):
    """
    Divides a total count into equally sized segments and assigns each a bin number.

    Args:
    - total_count (int): The total count to be divided into segments.
    - num_bins (int): The number of bins (segments) to create.

    Returns:
    - list: A list of dictionaries, each representing a segment with start, end, and bin number.
    """
    start_point = 0
    segments = []
    for i in range(num_bins):
        segments.append(
            {
                "begin": start_point,
                "end": start_point + total_count / num_bins,
                "bin": i,
            }
        )
        start_point += total_count / num_bins
    return segments


def categorize_tree_nodes_into_bins(node, r_array):
    if "children" not in node:
        for r in r_array:
            if node["index"] >= r["begin"] and node["index"] <= r["end"]:
                node["bin"] = r["bin"]
                node["values"]["group"] = f'{r["bin"]}type'

    if "children" in node:
        for child in node["children"]:
            categorize_tree_nodes_into_bins(child, r_array)


def generate_single_random_coordinate(mean_x, std_dev_x, mean_y, std_dev_y):
    """
    Generate a single random (x, y) coordinate from a normal distribution.

    Parameters:
    - mean_x: Mean of the normal distribution for the x coordinate.
    - std_dev_x: Standard deviation of the normal distribution for the x coordinate.
    - mean_y: Mean of the normal distribution for the y coordinate.
    - std_dev_y: Standard deviation of the normal distribution for the y coordinate.

    Returns:
    - coordinate: A tuple representing the (x, y) coordinate of a point.
    """
    x_coordinate = np.random.normal(mean_x, std_dev_x)
    y_coordinate = np.random.normal(mean_y, std_dev_y)

    coordinate = (x_coordinate, y_coordinate)
    return coordinate


def populate_bins_with_centroids(bin_segments):
    for ratio in bin_segments:
        ratio["centroid"] = {"x": np.random.normal(0, 5), "y": np.random.normal(0, 5)}


def populate_bins_with_radius(bin_segments, upper, down):
    for ratio in bin_segments:
        ratio["radius"] = np.random.normal(upper, down)


def set_bin_idx(node, ratio_array, k):
    if "children" not in node:
        node["bin_idx"] = (node["index"] % k) + 1

    if "children" in node:
        for child in node["children"]:
            set_bin_idx(child, ratio_array, k)


def calculate_leaves_per_bin(node, bin_counts):
    """
    Recursively calculates the number of leaves in each bin and updates bin_counts.
    """
    if "children" not in node:
        # This is a leaf node
        bin_index = node.get("bin")
        if bin_index is not None:
            bin_counts[bin_index] = bin_counts.get(bin_index, 0) + 1
    else:
        # This node has children, recurse on each child
        for child in node["children"]:
            calculate_leaves_per_bin(child, bin_counts)


# Adjusted sine function to handle scalar input
def noisy_sine(x, noise_level=0.1):
    noise = np.random.normal(0, noise_level)
    return np.sin(x) + noise


# Adjusted cosine function to handle scalar input
def noisy_cose(x, noise_level=0.1):
    noise = np.random.normal(0, noise_level)
    return np.cos(x) + noise


def coordinates(node, ratio_array, bin_counts, noise_level=0.1):
    if "children" not in node:
        bin_index = node["bin"]
        centroid_x = ratio_array[bin_index]["centroid"]["x"]
        centroid_y = ratio_array[bin_index]["centroid"]["y"]
        bin_radius = ratio_array[bin_index]["radius"]

        number_per_bin = bin_counts[
            bin_index
        ]  # Get the actual count of leaves in this bin
        angle = (2 * math.pi / number_per_bin) * (node["index"] % number_per_bin)

        # Apply noisy sine and cosine
        node["values"]["x"] = noisy_cose(angle, noise_level) * bin_radius + centroid_x
        node["values"]["z"] = noisy_sine(angle, noise_level) * bin_radius + centroid_y

    else:
        for child in node["children"]:
            coordinates(child, ratio_array, bin_counts, noise_level)


if "__main__" == __name__:
    cell_count = 4
    k = 2

    t = treesim.birth_death_tree(
        birth_rate=0.2, death_rate=0, num_extant_tips=cell_count
    )

    t.print_plot()

    newick_tree = t.as_string("newick")

    newick_tree = newick_tree.replace("[&R]", "")

    print(newick_tree)

    bin_segments = create_equal_segments_with_bins(cell_count, k)

    populate_bins_with_centroids(bin_segments)

    populate_bins_with_radius(bin_segments, upper=1, down=2)

    t_structure = convert_pair_bracket_string_to_json(newick_tree)

    index_leaves(t_structure)

    categorize_tree_nodes_into_bins(t_structure, bin_segments)

    set_bin_idx(t_structure, bin_segments, k)

    bin_counts = {}

    calculate_leaves_per_bin(t_structure, bin_counts)

    coordinates(t_structure, bin_segments, bin_counts)

    t_structure["groups"] = [f"{i}type" for i in range(k)]

    write_pair_bracket_string_to_json(
        t_structure, "../test/random_generated_tree_circle_simulation_new.json"
    )
