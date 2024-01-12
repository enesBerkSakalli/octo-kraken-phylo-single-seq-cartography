import pandas as pd
from advanced_tree_parser_util import convert_pair_bracket_string_to_json
import random
from advanced_tree_parser_util import write_pair_bracket_string_to_json
import sys

sys.setrecursionlimit(60000)


def get_tree(tree_file):
    with open(tree_file) as f:
        tree = f.readline().strip()
    return tree


def convert_csv_to_pandas(file_name):
    df = pd.read_csv(file_name, index_col=0)
    return df


def assign_dimensionality__reduction_coordinates_to_nodes(subtree, pd_frame_meta_data):
    if subtree["name"] in pd_frame_meta_data.index:
        subtree["values"]["x"] = pd_frame_meta_data.loc[subtree["name"], "UMAP_1"].astype(float)
        subtree["values"]["y"] = pd_frame_meta_data.loc[subtree["name"], "UMAP_2"].astype(float)
        subtree["values"]["group"] = pd_frame_meta_data.loc[subtree["name"], "cluster"]

        print(subtree["values"]["group"], subtree["values"]["x"], subtree["values"]["y"])
        
        # print(subtree["name"])
                
        subtree["values"]["distances_to_root_tips_fix"] = pd_frame_meta_data.loc[
            subtree["name"], "distances_to_root_tips_fix"
        ]
        subtree["values"]["distances_to_root"] = pd_frame_meta_data.loc[
            subtree["name"], "distances_to_root"
        ]

        subtree["values"]["z"] = pd_frame_meta_data.loc[
            subtree["name"], "distances_to_root_tips_fix"
        ]
        subtree["values"]["orig.ident"] = pd_frame_meta_data.loc[
            subtree["name"], "orig.ident"
        ]
        
    if "children" in subtree:
        for child in subtree["children"]:
            assign_dimensionality__reduction_coordinates_to_nodes(
                child, pd_frame_meta_data
            )
    return subtree


def clear_node_name(tree):
    tree["name"] = tree["name"].split("/")[0]
    if "children" in tree:
        for child in tree["children"]:
            clear_node_name(child)
    return tree


def julia_to_json(tree_file, csv_file, json_file):
    pair_bracket_string = get_tree(tree_file)
    pandas_frame = convert_csv_to_pandas(csv_file)
    json_tree = convert_pair_bracket_string_to_json(pair_bracket_string)
    clear_node_name(json_tree)
    pandas_frame.index = pandas_frame.index.to_series().str.replace(
        r"/.*", "", regex=True
    )
    json_tree["groups"] = list(set(pandas_frame["cluster"]))
    assign_dimensionality__reduction_coordinates_to_nodes(json_tree, pandas_frame)
    write_pair_bracket_string_to_json(json_tree, json_file)


if __name__ == "__main__":
    julia_to_json(
        "./julia/pancreas/alignment_obj_hvgfromspliced_genewisenormed.fasta.treefile",
        "./julia/pancreas/metadata_pancreas.csv",
        "./static/test/julia_pancreas.json",
    )
    
    """
    tree_file = ("./static/test/pb33mk_upgma_tree.nwk")
    pair_bracket_string = get_tree(tree_file)
    pandas_frame = convert_csv_to_pandas("./static/test/pbmc3k_cell_clusters.csv")
    # print(pandas_frame.head())
    json_tree = convert_pair_bracket_string_to_json(pair_bracket_string)
    clear_node_name(json_tree)

    pandas_frame.index = pandas_frame.index.to_series().str.replace(
        r"/.*", "", regex=True
    )
    
    # print(json_tree)
    assign_dimensionality__reduction_coordinates_to_nodes(json_tree, pandas_frame)
    # Replace '/...' with an empty string
    # pandas_frame[0] = pandas_frame[0].str.replace(r'/.*', '', regex=True)
    # print(pandas_frame.index)

    json_tree["groups"] = list(set(pandas_frame["cluster"]))
    print(json_tree["groups"])
    write_pair_bracket_string_to_json(json_tree, "./static/test/pb33mk_upgma.json")
    """

