## Command Samples
### Fluid Search
- *spatial attention*
- Search for *parallel distributed processing*.
- Find notes about *empiricism*.

### Descriptive Search
- This text describes a metaphor bridging disparate fields.
- This entry argues that recording neural activity with EEG is challenging.
- This note contains a formal definition related to philosophy.

### Question Answering
- What is cognitive scaffolding?
- Who wrote "The Astonishing Hypothesis"?
- How do algorithms inherit biases?

### Question Generation
- Quiz me about *modal logic*.
- Ask me about *theoretical models of attention*.
- Test me on *Darwinism*.

## Usage (Backend, Source)
```
pip3 install -r requirements.txt
```
```
python3 server.py --path ./test_knowledge_base
```
```
GET 127.0.0.1:5000/<query>
```