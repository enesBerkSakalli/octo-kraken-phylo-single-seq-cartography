def pair_bracket_to_json(pair_bracket_string):

    pair_bracket_string = pair_bracket_string.replace(";", "")

    if '(' not in pair_bracket_string:

        if len(pair_bracket_string.split(',')) == 1:

            if ":" not in pair_bracket_string:

                label = pair_bracket_string
                length = ""

            else:

                label = pair_bracket_string[:pair_bracket_string.find(":")]

                length = float(pair_bracket_string[pair_bracket_string.find(":") + 1:])

            return {"name": label, "length": length}
        
        else:

            return pair_bracket_string.split(',')
    else:

        label, length, data = parse_node(pair_bracket_string)
        children = [pair_bracket_to_json(item) for item in data]

        return {"name": label, "length": length, "children": children}

def set_inner_node_names(node, label):
    if('children' in node):
        label = []
        for child in node['children']:
            set_inner_node_names(child, label)
            if('' != child['name']):
                label.append(child['name'])
            node['name'] =  flatten(label)

def parse_node(pair_bracket_string):
    parent_count = 0
    tree = ''
    processed = ''
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
                    tree = pair_bracket_string[index + 2:]
                    break
        if char == ",":
            if parent_count != 1:
                processed += "|"
            else:
                processed += ","
        else:
            processed += char
        index += 1
    data = processed.split(',')
    for i in range(len(data)):
        data[i] = data[i].replace('|', ',')
    t = tree.strip()
    if t.find(":") == -1:
        label = t
        dist = ""
    else:
        label = t[:t.find(":")]
        dist = float(t[t.find(":") + 1:])
    return (label, dist, data)

def get_leaf_order(node, order):
    for child in node['children']:
        if('children' not in child):
            order.append(child['name'])
        else:
            get_leaf_order(child,order)
    return order

def encode_internal_node_names(node, leaf_order):
    encoded_name = [leaf_order.index(taxon) for taxon in node['name']]
    node['name'] = encoded_name    
    if('children' in node):    
        for child in node['children']:
            encode_internal_node_names(child, leaf_order)

def pair_to_json_encoded(pair_bracket_string):
    tree_dictionary = pair_bracket_to_json(pair_bracket_string)
    leaf_order = get_leaf_order(tree_dictionary, [])
    set_inner_node_names(tree_dictionary,[])
    # encode_internal_node_names(tree_dictionary, leaf_order)
    return tree_dictionary

def flatten(list_of_lists):
    if len(list_of_lists) == 0:
        return list_of_lists
    if isinstance(list_of_lists[0], list):
        return flatten(list_of_lists[0]) + flatten(list_of_lists[1:])
    return list_of_lists[:1] + flatten(list_of_lists[1:])


from Bio import AlignIO
from ete3 import Tree
import json

def generate_tree(n):
    cell_name_list = [f'cell-{i}' for i in range(n)]
    t = Tree()
    t.populate(size=n, names_library=cell_name_list, reuse_names=False, support_range=(0.5, 1.0))
    t.set_outgroup(t.get_midpoint_outgroup())
    file_name = 'random_generated_tree.tree'

    with open(f'{file_name}', 'w') as f:
        newick_string = t.write()
        newick_string = newick_string.replace(')1',')')
        f.write(newick_string)
        # print(f"{newick_string}")
    return t

if __name__ == '__main__':
    tree = generate_tree(100)
    
    with open('./static/test/simulated_test.json', 'w') as f:
        newick_json = pair_to_json_encoded(tree.write())
        json_tree = json.dumps(newick_json, indent=4)
        f.write(json_tree)
    
    alignment = AlignIO.read(open("random_generated_tree.dat" ),"phylip")
    print("Alignment length %i" % alignment.get_alignment_length())
    multiple_sequence_alignment_dictionary = {}

    for record in alignment:
        print(record.seq + " " + record.id)
        multiple_sequence_alignment_dictionary[str(record.id)] = str(record.seq)

    with open('./static/test/simulated_test_mlt.json', 'w') as f:
        f.write(json.dumps(multiple_sequence_alignment_dictionary, indent=4))
