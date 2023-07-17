import numpy as np
import scanpy as sc
from scipy.cluster.hierarchy import linkage, to_tree
from sklearn.decomposition import TruncatedSVD
import json

def generate_data(n_samples=3000, n_features=500):
    X = np.random.rand(n_samples, n_features)
    adata = sc.AnnData(X)
    return adata

def preprocess_data(adata):
    sc.pp.normalize_total(adata, target_sum=1e4)
    sc.pp.log1p(adata)
    sc.pp.highly_variable_genes(adata, min_mean=0.0125, max_mean=3, min_disp=0.5)
    if np.any(adata.var['highly_variable']):
        adata = adata[:, adata.var['highly_variable']]
    else:
        print("No highly variable genes found. Proceeding with original data.")
    return adata

def reduce_dimensionality(adata):
    adata.obsm['X_pca'] = TruncatedSVD(n_components=50).fit_transform(adata.X)
    return adata

def cluster_data(adata):
    Z = linkage(adata.obsm['X_pca'], 'ward')
    T = to_tree(Z)
    return T

def convert_to_dict(T):
    def add_node(node):
        if node.is_leaf():
            return {"name": str(node.id)}
        else:
            return {"name": "", "children": [add_node(node.get_left()), add_node(node.get_right())]}
    D = add_node(T)
    return D

def save_dict_to_file(D, filename="pb33mk_clustered.json"):
    with open(filename, "w") as f:
        f.write(json.dumps(D, indent=2))

def main():
    adata = generate_data()
    adata = preprocess_data(adata)
    adata = reduce_dimensionality(adata)
    T = cluster_data(adata)
    D = convert_to_dict(T)
    save_dict_to_file(D)

if __name__ == "__main__":
    main()
