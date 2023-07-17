import scanpy as sc
from scipy.cluster.hierarchy import linkage, to_tree
from sklearn.decomposition import TruncatedSVD
import json

# Load the data
adata = sc.datasets.pbmc3k()

# Preprocess the data
sc.pp.normalize_total(adata, target_sum=1e4)
sc.pp.log1p(adata)
sc.pp.highly_variable_genes(adata, min_mean=0.0125, max_mean=3, min_disp=0.5)
adata = adata[:, adata.var["highly_variable"]]

# Reduce dimensionality
adata.obsm["X_pca"] = TruncatedSVD(n_components=50).fit_transform(adata.X.toarray())

# Cluster the data
Z = linkage(adata.obsm["X_pca"], "ward")

# Convert the linkage matrix to a tree object
T = to_tree(Z)


# Recursive function to convert the tree object to a dictionary
def add_node(node):
    # If we have a leaf node
    if node.is_leaf():
        return {"name": adata.obs_names[node.id], "length": node.dist}
    # If we have an internal node
    else:
        return {
            "name": "",
            "children": [add_node(node.get_left()), add_node(node.get_right())],
            "length": node.dist
        }


# Convert the tree object to a dictionary
D = add_node(T)
# Print the dictionary
print(json.dumps(D, indent=2))
f = open("./static/test/simulated_matrix_to_cell_tree.json", "w")
f.write(json.dumps(D, indent=2))
f.close()
