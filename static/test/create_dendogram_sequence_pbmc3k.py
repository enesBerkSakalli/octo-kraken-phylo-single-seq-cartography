import scanpy as sc
from scipy.cluster.hierarchy import linkage, to_tree
from sklearn.decomposition import TruncatedSVD
import json
import pandas as pd
from scipy.spatial.distance import pdist, squareform
import dendropy
import sys

sys.setrecursionlimit(60000)



def load_and_preprocess_data():
    adata = sc.datasets.pbmc3k()

    sc.pp.normalize_total(adata, target_sum=1e4)
    sc.pp.log1p(adata)
    sc.pp.highly_variable_genes(adata, min_mean=0.0125, max_mean=3, min_disp=0.5)
    adata = adata[:, adata.var["highly_variable"]]

    return adata


def binarize_data(adata):
    adata.X = (adata.X > 0).astype(int)
    return adata


def perform_dimensionality_reduction(adata, n_components=50):
    adata.obsm["X_pca"] = TruncatedSVD(n_components=n_components).fit_transform(
        adata.X.toarray()
    )
    return adata


def cluster_data(adata):
    return linkage(adata.obsm["X_pca"], "ward")


def build_tree(Z):
    return to_tree(Z)


def convert_to_dict(node, adata):
    if node.is_leaf():
        return {
            "name": adata.obs_names[node.id],
            "length": node.dist,
            "values": {
                "x": 49.00118281559769,
                "y": 141.01014459829452,
                "z": 132.66489630271064,
                "group": 6,
            },
        }
    else:
        return {
            "name": "",
            "children": [
                convert_to_dict(node.get_left(), adata),
                convert_to_dict(node.get_right(), adata),
            ],
            "length": node.dist,
            "values": {
                "x": 49.00118281559769,
                "y": 141.01014459829452,
                "z": 132.66489630271064,
                "group": 6,
            },
        }


def write_to_json(data, file_path):
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)


def save_binarized_data_to_csv(adata, file_path):
    # Binarizing the data
    binarized_data = (adata.X > 0).astype(int)
    # Converting to DataFrame for easy CSV writing
    binarized_df = pd.DataFrame(
        binarized_data.toarray(), index=adata.obs_names, columns=adata.var_names
    )
    # Writing to CSV
    binarized_df.to_csv(file_path)
    return binarized_data


def calculate_hamming_distance_matrix(adata):
    # Ensure the data is binarized
    binarized_data = (adata.X > 0).astype(int)
    # Calculate pairwise Hamming distances
    hamming_distances = pdist(binarized_data.toarray(), metric="hamming")
    # Convert to a square form distance matrix
    hamming_distance_matrix = squareform(hamming_distances)
    hamming_df = pd.DataFrame(
        hamming_distance_matrix, index=adata.obs_names, columns=adata.obs_names
    )
    hamming_df.to_csv("./static/test/pb33mk_hamming_distance_matrix.csv")
    return hamming_distance_matrix


def calculate_raw_hamming_distance_matrix(adata):
    # Ensure the data is binarized
    binarized_data = (adata.X > 0).astype(int)
    # Calculate pairwise Hamming distances as proportions
    hamming_distances = pdist(binarized_data.toarray(), metric="hamming")
    # Convert proportions to raw counts (integers)
    num_features = binarized_data.shape[1]
    raw_hamming_distances = (hamming_distances * num_features).astype(int)
    # Convert to a square form distance matrix
    raw_hamming_distance_matrix = squareform(raw_hamming_distances)
    hamming_df = pd.DataFrame(
        raw_hamming_distance_matrix, index=adata.obs_names, columns=adata.obs_names
    )
    hamming_df.to_csv("./static/test/pb33mk_hamming_distance_matrix.csv")
    return raw_hamming_distance_matrix


# Main workflow
if __name__ == "__main__":
    adata = load_and_preprocess_data()

    save_binarized_data_to_csv(adata, "./static/test/pb33mk.csv")

    hamming_distance_matrix = calculate_raw_hamming_distance_matrix(adata)
    
    pdm = dendropy.PhylogeneticDistanceMatrix.from_csv(
        src=open("./static/test/pb33mk_hamming_distance_matrix.csv"), delimiter=","
    )

    nj_tree = pdm.nj_tree()
    nj_tree.phylogenetic_distance_matrix()
    nj_tree.write_to_path("./static/test/pb33mk_nj_tree.nwk", schema="newick")

    upgma_tree = pdm.upgma_tree()
    upgma_tree.write_to_path("./static/test/pb33mk_upgma_tree.nwk", schema="newick")
w