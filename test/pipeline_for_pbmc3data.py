"""import scanpy as sc

# Load pbmc3k dataset
adata = sc.datasets.pbmc3k()

# 1. Preprocessing
# Normalize data to ensure each cell has the same total counts
sc.pp.normalize_total(adata, target_sum=1e4)

# Logarithmize the data
sc.pp.log1p(adata)

# Identify highly variable genes to focus on genes with the most information
sc.pp.highly_variable_genes(adata, min_mean=0.0125, max_mean=3, min_disp=0.5)
adata = adata[:, adata.var['highly_variable']]

# 2. Dimensionality Reduction
# Compute PCA (Principal Component Analysis) on the data
sc.pp.pca(adata, n_comps=50, use_highly_variable=True)

# Compute the neighborhood graph
sc.pp.neighbors(adata)

# 3. Clustering
# Cluster cells using the Leiden algorithm
sc.tl.leiden(adata)

# 4. Embedding and Visualization
# Run UMAP for visualization, a common technique for visualizing high-dimensional data
sc.tl.umap(adata)

# 5. Differential Expression Analysis
# Find marker genes
sc.tl.rank_genes_groups(adata, 'leiden', method='t-test')

# 6. Plotting and Visualization
# Plot UMAP with cell clusters
sc.pl.umap(adata, color='leiden')

# Plot marker genes
sc.pl.rank_genes_groups(adata, n_genes=25, sharey=False)

# Save results
adata.write('pbmc3k_processed.h5ad')
"""

import scanpy as sc
import pandas as pd

# Load pbmc3k dataset
adata = sc.datasets.pbmc3k()

# Preprocessing
sc.pp.normalize_total(adata, target_sum=1e4)
sc.pp.log1p(adata)
sc.pp.highly_variable_genes(adata, min_mean=0.0125, max_mean=3, min_disp=0.5)
adata = adata[:, adata.var['highly_variable']]

# Dimensionality Reduction
sc.pp.pca(adata, n_comps=50, use_highly_variable=True)
sc.pp.neighbors(adata)

# Clustering
sc.tl.leiden(adata)

# Embedding and Visualization
sc.tl.umap(adata)
sc.pl.umap(adata, color='leiden')

# Differential Expression Analysis
sc.tl.rank_genes_groups(adata, 'leiden', method='t-test')

# Plotting and Visualization
sc.pl.rank_genes_groups(adata, n_genes=25, sharey=False)

# Save results
adata.write('pbmc3k_processed.h5ad')

# Save cell clusters to CSV
cell_clusters = adata.obs['leiden']
cell_cluster_df = pd.DataFrame(cell_clusters)
cell_cluster_df['UMAP1'] = adata.obsm['X_umap'][:, 0]
cell_cluster_df['UMAP2'] = adata.obsm['X_umap'][:, 1]
cell_cluster_df.to_csv('pbmc3k_cell_clusters.csv')
