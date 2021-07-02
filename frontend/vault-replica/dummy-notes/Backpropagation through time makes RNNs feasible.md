---
resource: https://www.ai.rug.nl/minds/uploads/LN_NN_RUG.pdf
---

By unfolding a [[Recurrent networks approximate dynamical systems|recurrent neural network]] into a [[Feedforward networks approximate functions|feedforward one]] using a clone for each time point, an engineer can apply [[Backpropagation renders gradient descent feasible|backpropagation to RNNs]]. This makes the infamously difficult to train models somewhat easier to train. However, there are drawbacks. For instance, only a certain number of time points can be considered in the unrolled network, limiting the ability of RNNs to [[Dynamical systems have memory|learn memory effects]].