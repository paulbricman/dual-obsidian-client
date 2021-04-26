---
resource: https://www.ai.rug.nl/minds/uploads/LN_NN_RUG.pdf
---

Contrary to what many believe, reaching the global optimum through [[End-to-end differentiation enables powerful optimization techniques|gradient descent]] is NOT the goal of [[Supervised learning assumes underlying structure|supervised learning]]. Reaching the global minimum of the [[Risk is statistical expectation of loss|empirical risk surface]] would virtually guarantee [[Regularization penalizes flexibility|overfitting]]. Rather, local minima are more than enough, stopping when the [[Regularization penalizes flexibility|testing loss starts to increase]].