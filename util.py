from Bio import AlignIO
from ete3 import Tree
import json
import random
import string
from advanced_tree_parser_util import (
    write_pair_bracket_string_to_json,
    convert_pair_bracket_string_to_json,
)
import re
import matplotlib.pyplot as plt
import numpy as np
import random
from sklearn.datasets._samples_generator import make_blobs
from sklearn.cluster import KMeans
import subprocess


def generate_clusters(max_num_clusters=10, points_per_cluster=200, std_dev=10):
    num_clusters = random.randint(2, max_num_clusters)

    cluster_centers = []  # centers of the clusters

    for i in range(random.randint(1, num_clusters)):
        cluster_centers.append((random.randint(0, 200), random.randint(0, 200), i))

    points = []
    # generate points for each cluster

    for center in cluster_centers:
        for _ in range(points_per_cluster):
            point = [
                np.random.normal(loc=center[0], scale=std_dev),
                np.random.normal(loc=center[1], scale=std_dev),
                np.random.normal(loc=center[1], scale=std_dev),
                center[2],
            ]
            points.append(point)

    x, y, z, center = zip(*points)
    return x, y, z, center


def plot_clusters(x, y):
    plt.figure(figsize=(8, 6))
    plt.scatter(x, y)
    plt.title("2D Data Plot")
    plt.xlabel("X Values")
    plt.ylabel("Y Values")
    plt.show()


def find_clusters(X, n_clusters, rseed=2):
    rng = np.random.RandomState(rseed)
    i = rng.permutation(X.shape[0])[:n_clusters]
    centers = X[i]


def generate_tree(n):
    cell_names = [f"{random.choice(string.ascii_uppercase)}_cell-{i}" for i in range(n)]

    t = Tree()

    t.populate(
        size=n,
        names_library=cell_names,
        reuse_names=False,
        support_range=(0.5, 1.0),
    )

    t.set_outgroup(t.get_midpoint_outgroup())
    file_name = "random_generated_tree.tree"

    with open(f"{file_name}", "w") as f:
        newick_string = t.write(format=1)
        newick_string_added_values = newick_string  # add_values_to_nodes(newick_string)
        f.write(t.write(format=1))
    return t, newick_string_added_values


def write_msa_to_json_format(file_name):
    alignment = AlignIO.read(open(file_name), "phylip")
    multiple_sequence_alignment_dictionary = []
    for record in alignment:
        msa_entry = {}
        msa_entry["id"] = str(record.id)
        msa_entry["sequence"] = str(record.seq)
        multiple_sequence_alignment_dictionary.append(msa_entry)

    with open("./static/test/random_generated_tree_msa.json", "w") as f:
        f.write(json.dumps(multiple_sequence_alignment_dictionary, indent=4))


def generate_tree_and_and_msa(n):
    t, newick_string_added_values = generate_tree(n)
    file_name_tree = "random_generated_tree.tree"
    file_name_json = "./static/test/random_generated_tree.json"
    tree_dictionary = convert_pair_bracket_string_to_json(newick_string_added_values)
    x, y, z, centers = generate_clusters(4, len(t.get_leaves()))
    tree_dictionary = assign_dimensionality__reduction_coordinate_tree_leaves(
        tree_dictionary, {"x": x, "y": y, "z": z, "group": centers}
    )

    groups = list(set(centers))
    tree_dictionary["groups"] = groups
    print(tree_dictionary)

    write_pair_bracket_string_to_json(tree_dictionary, file_name_json)

    random_phy_file_name = "random_generated_tree.phy"

    subprocess.call(
        f"./Seq-Gen-1.3.4/seq-gen -mHKY -t3.0 -f0.3,0.2,0.2,0.3 -l1000 -n1 < {file_name_tree} > {random_phy_file_name}",
        shell=True,
    )
    write_msa_to_json_format(random_phy_file_name)


def assign_dimensionality__reduction_coordinate_tree_leaves(
    subtree, dimensionality_reduction_coordinates
):
    if "children" in subtree:
        for child in subtree["children"]:
            assign_dimensionality__reduction_coordinate_tree_leaves(
                child, dimensionality_reduction_coordinates
            )
    else:
        random_index = random.randint(
            0, len(dimensionality_reduction_coordinates["x"]) - 1
        )
        subtree["values"]["x"] = dimensionality_reduction_coordinates["x"][random_index]
        subtree["values"]["y"] = dimensionality_reduction_coordinates["y"][random_index]
        subtree["values"]["z"] = dimensionality_reduction_coordinates["z"][random_index]
        subtree["values"]["group"] = dimensionality_reduction_coordinates["group"][
            random_index
        ]
    return subtree


def add_values_to_nodes(newick_string):
    # This regex matches a closing parenthesis in the Newick format
    pattern = r"\)"

    # Function to generate replacement string
    def replacement(match):
        # Create a string with the values
        values = f"[bootstrap={random.randint(100,1000)}, delta={random.uniform(0,1)}, color='red']"
        # Return the match with the values appended
        return match.group() + values

    # Add square brackets with values to the nodes
    newick_string = re.sub(pattern, replacement, newick_string)

    return newick_string


if __name__ == "__main__":
    generate_tree_and_and_msa(16)
