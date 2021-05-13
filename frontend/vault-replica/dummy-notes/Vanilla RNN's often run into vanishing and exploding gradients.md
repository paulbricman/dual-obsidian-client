---
resource: https://www.ai.rug.nl/minds/uploads/LN_NN_RUG.pdf
---

Due to their [[Recurrent networks approximate dynamical systems|recurrent nature]], [[Backpropagation through time makes RNN's feasible|the parameters of RNN's]] are changed proportional to a partial derivative which is exponential. If larger than one, it often explodes with [[Backpropagation through time makes RNN's feasible|long considered sequences]]. If smaller than one, it often vanishes. [[LSTM's mitigate RNN issues|LSTM's attempt to solve this]].