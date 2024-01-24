import networkx as nx
from pipeline.advanced_tree_parser_util import pair_to_json_encoded

# Function to convert parsed tree to NetworkX graph
def add_tree_to_graph(tree, graph, parent=None, counter=1):
    node_name = tree['name'] if tree['name'] else f"Node-{counter}"
    graph.add_node(node_name)
    if parent is not None:
        graph.add_edge(parent, node_name)
    for child in tree.get('children', []):
        counter += 1
        add_tree_to_graph(child, graph, node_name, counter)
    return counter

# Function to attach the subtree to a specific edge in the main tree
def attach_subtree_to_edge_corrected(main_tree, subtree, edge):
    result_tree = main_tree.copy()

    attached_subtree = subtree.copy()

    new_node = f"attachment_{str(id(edge))}"
    result_tree.add_node(new_node)
    result_tree.add_edge(new_node, edge[0])
    result_tree.add_edge(new_node, edge[1])
    result_tree.remove_edge(edge[0], edge[1])
    subtree_root = list(attached_subtree.nodes())[0]
    result_tree = nx.compose(result_tree, attached_subtree)
    result_tree.add_edge(new_node, subtree_root)
    return result_tree

# Function to convert NetworkX graph to Newick string
def graph_to_newick(node, G, parent=None, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    children = [n for n in G.successors(node) if n not in visited]
    if not children:
        return node
    subtrees = (graph_to_newick(child, G, node, visited) for child in children)
    return f"({','.join(subtrees)}){node}"

# Main and subtree Newick strings
main_tree_str = "((A:1,B:1),O:1);"
subtree_str = "((X:1,Y:1):1);"

# (((A:1,(X:1,Y:1):1):1,B:1):1,O:1)
# (((A:1,(B:1,(X:1,Y:1):1):1,O:1)))
# ((A:1,B:1):1,(O:1,(X:1,Y:1):1):1)

# Parsing and conversion to NetworkX directed graphs
parsed_main_tree = pair_to_json_encoded(main_tree_str)
parsed_subtree = pair_to_json_encoded(subtree_str)
main_tree_graph = nx.DiGraph()
subtree_graph = nx.DiGraph()
add_tree_to_graph(parsed_main_tree, main_tree_graph)
add_tree_to_graph(parsed_subtree, subtree_graph)


# Generating Newick strings with corrected attachment
newick_strings = []
for edge in main_tree_graph.edges():
    combined_tree = attach_subtree_to_edge_corrected(main_tree_graph, subtree_graph, edge)
    root = list(nx.topological_sort(combined_tree))[0]  # Getting the topological root for the tree
    newick_string = graph_to_newick(root, combined_tree)
    newick_strings.append(newick_string)

for newick in newick_strings:
    print(newick+";")