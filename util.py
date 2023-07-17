from Bio import AlignIO
from ete3 import Tree
import json
import subprocess
import random
import string
from parser_util import write_pair_bracket_string_to_json
import re
import ngesh

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
        newick_string_added_values = add_values_to_nodes(newick_string)
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
    file_name_phy = "random_generated_tree_msa.phy"

    write_pair_bracket_string_to_json(newick_string_added_values, file_name_json)
    subprocess.call(
        f"./Seq-Gen-1.3.4/seq-gen -mHKY -t3.0 -f0.3,0.2,0.2,0.3 -l1000 -n1 < {file_name_tree} > {file_name_phy}",
        shell=True,
    )
    write_msa_to_json_format(file_name_phy)


def add_values_to_nodes(newick_string):
    # This regex matches a closing parenthesis in the Newick format
    pattern = r"\)"

    # Function to generate replacement string
    def replacement(match):
        # Create a string with the values
        values = f"[bootstrap={random.randint(100,1000)}, delta={random.uniform(0,1)}]"
        # Return the match with the values appended
        return match.group() + values

    # Add square brackets with values to the nodes
    newick_string = re.sub(pattern, replacement, newick_string)

    return newick_string


if __name__ == "__main__":
    generate_tree_and_and_msa(350)
 