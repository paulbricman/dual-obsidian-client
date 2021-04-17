# How to contribute to this project

### Before you begin
Make sure to read [the project write-up](https://psionica.org/docs/workshop/dual/) to get a better sense of this project's scope. Also, feel free to join [our Discord server](https://discord.gg/hREGTng6na) for discussing technical matters more effectively.

### Project structure
Dual has several moving parts to it. As mentioned in the write-up, the main components of the projects are the essence, the skeleton, and the interface.

#### Essence
The essence is a language model which was initially trained for text generation on a large generic text corpus, but which is fine-tuned by the user on their own notes before use so that it gets closer to their style of writing. Currently, GPT-2 is the model used for the task. The initial training process makes it so that the model is generally fluent, while the subsequent fine-tuning brings it closer to the user's way of thinking.

The fine-tuning process is performed using a Python notebook hosted on Google Colab, which can be accessed during the installation process. The notebook loads an instance of GPT-2 and fine-tunes it on the user's notes which are simply pasted in a text box beforehand. After the fine-tuning process is complete, the user can download the fine-tuned model on their machine. The notebook uses a custom early stopping strategy, in that it terminates the fine-tuning process when a set loss is reached, in order to avoid overfitting the model. The user can also choose among several model sizes, based on their setup.

#### Skeleton
The skeleton consists of a local Python server which mainly performs inference using local models. When the server receives a request, it first tests the query contained in it against some regex patterns specific to the three features (e.g. `Find notes about *topic*` triggers fluid search). For fluid search, a semantic embedding is derived from the query and compared to the semantic embeddings of each individual note. [Two models of increasing complexity are used for this search, progressively narrowing the search with increasingly complex models](https://www.sbert.net/examples/applications/cross-encoder/README.html). The closest matches are returned. For descriptive search, the fluid search outputs also undergo a [zero-shot classification](https://joeddav.github.io/blog/2020/05/29/ZSL.html) process in order to identify the notes which best match the description. When the server receives a question, it triggers open dialogue, which concatenates the notes most related to the question before attempting to generate a response.

However, a large part of the skeleton is devoted to maintaining a local cache. This cache contains the contents of the notes, semantic embeddings derived from the notes, and the file names of the notes. The main goal of maintaining a cache is to avoid having to compute semantic embeddings for all notes every single time a fluid search has to be conducted. The cache is a local pickle file which is updated during every call and on startup to accurately reflect the state of the vault.

#### Interface
The interface consists of an Obsidian plugin written in Typescript. It defines a chat-like interface in the right side panel and routes messages to the skeleton server. In this, the interface doesn't access the notes, it only talks to the server which does that. However, the plugin accesses the notes in one specific situation: during the setup when it enables the entire vault to be copied to clipboard as concatenated plain text. This makes it possible for the user to start configuring the essence right from the get go. 
