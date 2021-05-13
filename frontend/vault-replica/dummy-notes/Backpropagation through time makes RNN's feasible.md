---
resource: https://www.ai.rug.nl/minds/uploads/LN_NN_RUG.pdf
---

By unfolding a [[Recurrent networks approximate dynamical systems|recurrent neural network]] into a [[Feedforward networks approximate functions|feedforward one]] using multiple clones for each timestamp, one can apply [[Backpropagation renders gradient descent feasible|backpropagation to RNN's]]. This makes the infamously difficult to train models somewhat easier to train. However, there are drawbacks. For instance, only a certain number of timestamps can be considered, limiting the ability of RNN's to [[Dynamical systems have memory|learn memory effects]].