import re
import random
import json
import pprint


# Function to parse a node from a Newick string
def parse_node(pair_bracket_string):
    parent_count = 0
    tree = ""
    processed = ""
    index = 0
    # Iterate over each character in the string
    for char in pair_bracket_string:
        # If the character is an opening curved bracket
        if char == "(":
            # Increment the parent count
            parent_count += 1
            # If this is the first opening curved bracket, skip it
            if parent_count == 1:
                continue

        # If the character is a closing curved bracket
        elif char == ")":
            # Decrement the parent count
            parent_count -= 1

            # If there are no more open parents
            if parent_count == 0:
                # If the index is beyond the end of the string
                if index + 2 > len(pair_bracket_string):
                    # Break the loop
                    break
                else:
                    # Otherwise, set the tree to the rest of the string and break the loop
                    tree = pair_bracket_string[index + 2 :]
                    break

        # If the character is a comma
        if char == ",":
            # If there is more than one open parent
            if parent_count != 1:
                # Add a pipe to the processed string
                processed += "|"
            else:
                # Otherwise, add a comma to the processed string
                processed += ","
        else:
            # If the character is not a comma, add it to the processed string
            processed += char
        # Increment the index
        index += 1

    # Split the processed string by semicolons outside brackets
    data = split_on_semicolons_outside_brackets(processed)

    # Replace all pipes with commas in the data
    for i in range(len(data)):
        data[i] = data[i].replace("|", ",")

    # Extract the values in brackets as a dictionary
    value_set = extract_values_in_brackets_as_dict(pair_bracket_string)
    # Parse the branch length and label
    label, dist = parse_branch_length_and_label(tree)
    # Return the label, the distance, the data, and the value set
    return (label, dist, data, value_set)


# Function to convert a Newick string to a JSON object
def pair_bracket_to_json(pair_bracket_string):
    # Remove all semicolons from the string
    pair_bracket_string = pair_bracket_string.replace(";", "")

    # If the string does not contain any opening curved brackets
    if "(" not in pair_bracket_string:
        # If the string contains only one element when split by semicolons outside brackets
        if len(split_on_semicolons_outside_brackets(pair_bracket_string)) == 1:
            # If the string does not contain any colons
            if ":" not in pair_bracket_string:
                # The entire string is the label
                label = pair_bracket_string

                # There is no length
                length = None

            else:
                # The label is the part of the string before the first colon
                label = pair_bracket_string[: pair_bracket_string.find(":")]
                leaf_values = extract_values_in_brackets_as_dict(label)
                # The length is the part of the string after the first colon, converted to a float
                length = float(pair_bracket_string[pair_bracket_string.find(":") + 1 :])
                # Remove the values from the label
                label = remove_square_brackets(label)

            # Return a dictionary with the label and the length
            return {"name": label, "length": length, "values": leaf_values}

        else:
            # If the string contains more than one element when split by semicolons outside brackets, return the split string
            return split_on_semicolons_outside_brackets(pair_bracket_string)
    else:
        # If the string contains an opening curved bracket, parse the node
        label, length, data, value_set = parse_node(pair_bracket_string)
        # Convert each child to a JSON object
        children = [pair_bracket_to_json(item) for item in data]
        # Return a dictionary with the label, the length, the children, and the values
        return {
            "name": label,
            "length": length,
            "children": children,
            "values": value_set,
        }


# Function to replace inner nodes in a Newick string with random values
def replace_inner_nodes(newick_string):
    # This regex matches a closing parenthesis followed by a comma or end of line
    # which indicates an inner node in Newick format.
    pattern = r"\)(,|$)"

    # Function to generate a replacement string with random values
    def replacement(match):
        # Generate the new string to replace with
        new_string = f")[delta={random.randint(0, 100)}, theta={random.randint(0, 100)}, p_value={random.uniform(0, 1)}]{match.group(1)}:"
        return new_string

    # Use the sub function to replace the matched patterns
    newick_string = re.sub(pattern, replacement, newick_string)
    return newick_string


def remove_square_brackets(s):
    return re.sub(r"\[.*?\]", "", s)


# Function to set the names of inner nodes based on their children
def set_inner_node_names(node, label):
    # If the node has children
    if "children" in node:
        # Initialize an empty list for the labels
        label = []
        # Iterate over the children
        for child in node["children"]:
            # Set the names of the child's inner nodes
            set_inner_node_names(child, label)
            # If the child has a name, add it to the labels
            if "" != child["name"]:
                label.append(child["name"])
            # Set the name of the node to the flattened labels

            node["name"] = flatten(label)


# Function to extract the values in brackets as a dictionary
def extract_values_in_brackets_as_dict(string):
    # This regular expression pattern matches anything enclosed in square brackets
    pattern = r"\[(.*?)\]"
    # Find all matches of the pattern in the string
    matches = re.findall(pattern, string)

    # Initialize an empty dictionary
    result = {}

    # Iterate over the matches
    for match in matches:
        # Split the match into key-value pairs
        pairs = match.split(",")
        # Iterate over the pairs
        for pair in pairs:
            # Split the pair into a key and a value
            key, value = pair.split("=")

            # Add the key-value pair to the dictionary
            result[key] = convert_to_float_if_possible(value)

    # Return the dictionary
    return result


def remove_spaces(s):
    return "".join(s.split())


# Function to split a string by semicolons outside brackets
def split_on_semicolons_outside_brackets(string):
    result = []
    current = []
    brackets = 0
    # Iterate over each character in the string
    for char in string:
        # If the character is an opening square bracket
        if char == "[":
            # Increment the bracket count
            brackets += 1
        # If the character is a closing square bracket
        elif char == "]":
            # Decrement the bracket count
            brackets -= 1
        # If the character is a comma and there are no open brackets
        elif char == "," and brackets == 0:
            # Add the current string to the result and start a new string
            result.append("".join(current))
            current = []
            continue
        # Add the character to the current string
        current.append(char)
    # Add the last string to the result
    result.append("".join(current))
    # Return the result
    return result


# Function to parse the branch length and label from a Newick string
def parse_branch_length_and_label(pair_bracket_string):
    # If the string contains a colon
    if ":" in pair_bracket_string:
        # Split the string into a label and a branch length
        label, branch_length = pair_bracket_string.split(":", maxsplit=1)
        # Convert the branch length to a float
        branch_length = float(branch_length)
        # Return the label and the branch length
        return label, branch_length
    else:
        # If the string does not contain a colon, return the string as the label and an empty string as the branch length
        return pair_bracket_string, ""


# Function to transform a tree in Newick format to JSON format
def transform_tree_file_to_json_file(input_file_name, destination_file_name):
    # Open the file
    with open(input_file_name, "r") as f:
        # Read the Newick string
        pair_bracket_string = f.read()
    # Write the Newick string to a JSON file
    write_pair_bracket_string_to_json(pair_bracket_string, destination_file_name)


# Function to write a Newick string to a JSON file
def write_pair_bracket_string_to_json(pair_bracket_string, file_name):
    # Convert the Newick string to a JSON object
    newick_json = pair_to_json_encoded(pair_bracket_string)
    # Convert the JSON object to a string
    json_tree = json.dumps(newick_json, indent=4)
    # Open the file
    with open(file_name, "w") as f:
        # Write the JSON string to the file
        f.write(json_tree)


# Function to convert a Newick string to a JSON object
def pair_to_json_encoded(pair_bracket_string):
    # Convert the Newick string to a dictionary
    tree_dictionary = pair_bracket_to_json(pair_bracket_string)
    # Get the order of the leaves
    leaf_order = get_leaf_order(tree_dictionary, [])
    # Set the names of the inner nodes
    # set_inner_node_names(tree_dictionary, leaf_order)
    # Encode the names of the inner nodes
    # encode_internal_node_names(tree_dictionary, leaf_order)
    # Return the dictionary
    return tree_dictionary


# Function to get the order of the leaves in a tree
def get_leaf_order(node, order):
    # Iterate over the children of the node
    for child in node["children"]:
        # If the child is a leaf
        if "children" not in child:
            # Add the name of the child to the order
            order.append(child["name"])
        else:
            # If the child is not a leaf, get the order of its leaves
            get_leaf_order(child, order)
    # Return the order
    return order


# Function to encode the names of the inner nodes in a tree
def encode_internal_node_names(node, leaf_order):
    # Encode the name of the node
    encoded_name = [leaf_order.index(taxon) for taxon in node["name"]]
    # If the node has children
    if "children" in node:
        # Set the name of the node to the encoded name
        node["name"] = encoded_name
        # Encode the names of the children
        for child in node["children"]:
            encode_internal_node_names(child, leaf_order)


# Function to flatten a list of lists
def flatten(list_of_lists):
    # If the list is empty, return it
    if len(list_of_lists) == 0:
        return list_of_lists
    # If the first element of the list is a list
    if isinstance(list_of_lists[0], list):
        # Flatten the first element and the rest of the list
        return flatten(list_of_lists[0]) + flatten(list_of_lists[1:])
    # If the first element of the list is not a list, return it followed by the flattened rest of the list
    return list_of_lists[:1] + flatten(list_of_lists[1:])


def delete_node(tree, node_to_delete):
    # Base case: If the tree is a leaf node, simply return
    if "children" not in tree:
        return

    # Check if one of the children is the node to delete
    for i, child in enumerate(tree["children"]):
        if child["name"] == node_to_delete:
            # If we found the node to delete, attach its children to the parent
            tree["children"].extend(child.get("children", []))
            # Delete the node itself
            del tree["children"][i]
            # We're done here, so return
            return

    # If we didn't find the node to delete yet, recurse into the children
    for child in tree["children"]:
        delete_node(child, node_to_delete)


def find_nodes_under_threshold(tree, _property, threshold=0.8):
    node_list = []

    # If the current node matches the condition, add it to the list
    if tree["values"].get(_property, float("inf")) < threshold:
        node_list.append(tree["name"])

    # If the tree is not a leaf node, recurse into the children
    if "children" in tree:
        for child in tree["children"]:
            node_list.extend(find_nodes_under_threshold(child, _property, threshold))

    return node_list


def delete_nodes_under_threshold(tree, _property, threshold=0.8):
    to_be_deleted_nodes = find_nodes_under_threshold(tree, _property, threshold)
    for node in to_be_deleted_nodes:
        delete_node(tree, node)


def convert_to_float_if_possible(value):
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return value
    else:
        return value


def read_newick_file(filename):
    try:
        with open(filename, "r") as file:
            data = file.read()
    except FileNotFoundError:
        print(f"No such file or directory: '{filename}'")
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

    return data

def write_json(data, filename):
    try:
        with open(filename, "w") as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    # Create a pretty printer object
    # pp = pprint.PrettyPrinter(indent=4)
    # pair_bracket_string = "((A[p_value=0.1, x=10, y=10]:0.1,B[p_value=0.1, x=10, y=10]:0.1)[p_value=0.1, x=10, y=10]:1,(C[p_value=0.1, x=10, y=10]:0.05,D[p_value=0.04, x=10, y=10]:0.1)[p_value=0.1, x=10, y=10]:0.1);"
    # pair_bracket_dictionary = pair_to_json_encoded(pair_bracket_string)
    # delete_nodes_under_threshold(pair_bracket_dictionary, "p_value", 0.06)
    # pp.pprint(pair_bracket_dictionary)

    newick_string = read_newick_file(
        "./data/alignment_obj_hvg_genewisenormed_splicedinfo.fasta.treefile_extended.nwk"
    )
    
    pair_bracket_dictionary = pair_to_json_encoded(newick_string)

    write_json(
        pair_bracket_dictionary,
        "./static/test/alignment_obj_hvg_genewisenormed_splicedinfo.fasta.treefile_extended.json",
    )

