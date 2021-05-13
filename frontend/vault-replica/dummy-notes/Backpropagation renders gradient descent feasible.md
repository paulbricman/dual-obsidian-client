---
resource: https://colah.github.io/posts/2015-08-Backprop/
---

In forward-mode differentiation, computing the partial derivative of [[Deep learning enables simple chained transformations|one node in a computational graph]] would require computing the partial derivatives for all nodes in the graph, making a single step in [[End-to-end differentiation enables powerful optimization techniques|gradient descent]] extremely computationally expensive. In contrast, in reverse-mode differentiation, which supports backpropagation, computing the partial derivative of all nodes can be done in one single sweep, by starting with the partial derivatives of the output nodes.