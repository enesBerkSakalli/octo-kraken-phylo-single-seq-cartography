def pair_bracket_to_json(pair_bracket_string):
    pair_bracket_string = pair_bracket_string.replace(";", "")

    if "(" not in pair_bracket_string:
        if len(pair_bracket_string.split(",")) == 1:
            if ":" not in pair_bracket_string:
                label = pair_bracket_string
                length = ""
            else:
                label = pair_bracket_string[: pair_bracket_string.find(":")]
                length = float(pair_bracket_string[pair_bracket_string.find(":") + 1 :])
            return {"name": label, "length": length}
        else:
            return pair_bracket_string.split(",")
    else:
        label, length, data, value_set = parse_node(pair_bracket_string)
        children = [pair_bracket_to_json(item) for item in data]
        return {
            "name": label,
            "length": length,
            "children": children,
            "values": value_set,
        }

def set_inner_node_names(node, label):
    if "children" in node:
        label = []
        for child in node["children"]:
            set_inner_node_names(child, label)
            if "" != child["name"]:
                label.append(child["name"])
            node["name"] = flatten(label)

def parse_node(pair_bracket_string):
    parent_count = 0
    tree = ""
    processed = ""
    index = 0
    for char in pair_bracket_string:
        if char == "(":
            parent_count += 1
            if parent_count == 1:
                continue

        elif char == ")":
            parent_count -= 1

            if parent_count == 0:
                if index + 2 > len(pair_bracket_string):
                    break
                else:
                    tree = pair_bracket_string[index + 2 :]
                    break

        if char == ",":
            if parent_count != 1:
                processed += "|"
            else:
                processed += ","
        else:
            processed += char
        index += 1

    data = processed.split(",")

    for i in range(len(data)):
        data[i] = data[i].replace("|", ",")

    value_set = parse_squared_bracket(pair_bracket_string)
    label, dist = parse_branch_length_and_label(tree)
    return (label, dist, data, value_set)

def parse_branch_length_and_label(pair_bracket_string):
    if ":" in pair_bracket_string:
        label, branch_length = pair_bracket_string.split(":", maxsplit=1)
        branch_length = float(branch_length)
        return label, branch_length
    else:
        return pair_bracket_string, ""

def parse_squared_bracket(pair_bracket_string):
    value_set = {}
    if "[" in pair_bracket_string:
        pattern = r"\[([^=\]]+)=(\d+)"
        matches = re.findall(pattern, pair_bracket_string)
        if matches:
            for left_side, value in matches:
                left_side = left_side.replace("&","")
                value_set[left_side] = float(value)
    return value_set

def get_leaf_order(node, order):
    for child in node["children"]:
        if "children" not in child:
            order.append(child["name"])
        else:
            get_leaf_order(child, order)
    return order

def encode_internal_node_names(node, leaf_order):
    encoded_name = [leaf_order.index(taxon) for taxon in node["name"]]
    node["name"] = encoded_name
    if "children" in node:
        for child in node["children"]:
            encode_internal_node_names(child, leaf_order)


def pair_to_json_encoded(pair_bracket_string):
    tree_dictionary = pair_bracket_to_json(pair_bracket_string)
    leaf_order = get_leaf_order(tree_dictionary, [])
    set_inner_node_names(tree_dictionary, [])
    # encode_internal_node_names(tree_dictionary, leaf_order)
    return tree_dictionary


def flatten(list_of_lists):
    if len(list_of_lists) == 0:
        return list_of_lists
    if isinstance(list_of_lists[0], list):
        return flatten(list_of_lists[0]) + flatten(list_of_lists[1:])
    return list_of_lists[:1] + flatten(list_of_lists[1:])


import re
from Bio import AlignIO
from ete3 import Tree
import json
import subprocess
import random
import string


def generate_tree(n):

    cell_names = [f"{random.choice(string.ascii_letters)}_cell-{i}" for i in range(n)]
    
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
        newick_string = t.write()
        newick_string = newick_string.replace(")1", ")")
        f.write(newick_string)
    return t

def write_pair_bracket_string_to_json(pair_bracket_string, file_name):
    newick_json = pair_to_json_encoded(pair_bracket_string)
    json_tree = json.dumps(newick_json, indent=4)
    with open(file_name, "w") as f:
        f.write(json_tree)


def write_msa_to_json_format(file_name):
    alignment = AlignIO.read(open(file_name), "phylip")
    multiple_sequence_alignment_dictionary = {}
    for record in alignment:
        print(record.seq + " " + record.id)
        multiple_sequence_alignment_dictionary[str(record.id)] = str(record.seq)
    with open("./static/test/random_generated_tree_msa.json", "w") as f:
        f.write(json.dumps(multiple_sequence_alignment_dictionary, indent=4))

def transform_tree_to_json_format(file_name):
    with open(file_name, "r") as f:
        pair_bracket_string = f.read()
    write_pair_bracket_string_to_json(pair_bracket_string, "./static/test/simulated_test.json")

def generate_tree_and_and_msa(n):
    t = generate_tree(n)
    file_name_tree = "random_generated_tree.tree"
    file_name_json = "./static/test/random_generated_tree.json"
    file_name_phy = "random_generated_tree_msa.phy"
    file_name_msa_json = "random_generated_tree_msa.json"

    write_pair_bracket_string_to_json(t.write(), file_name_json)
    subprocess.call(f'./Seq-Gen-1.3.4/seq-gen -mHKY -t3.0 -f0.3,0.2,0.2,0.3 -l1000 -n1 < {file_name_tree} > {file_name_phy}', shell=True)
    write_msa_to_json_format(file_name_phy)

if __name__ == "__main__":
    generate_tree_and_and_msa(100)
    # ((A,B)[&boot=500])
    # ((A,B)500:10)

    # print(generate_tree(200).write())    