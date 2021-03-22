---
resource: https://www.youtube.com/watch?v=Ag1bw8MfHGQ
---

Given unlabeled data, one can create training samples from it by partially corrupting it and tasking a model with restoring it. This has recently been done in natural language processing with BERT. However, the same approach is present in denoising autoencoders for computer vision. Additionally, given unlabeled data, one can also create training samples by extracting meaningful pairs of snippets from one initial data point or two different ones, and minimizing a triplet loss. This matching procedure is present in the joint-embedding architecture with Siamese networks, like in face recognition.