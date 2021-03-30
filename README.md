## Command Samples
### Fluid Search
- *spatial attention*
- Search for *parallel distributed processing*.
- Find notes about *empiricism*.

### Descriptive Search
- Search for a note which *describes a metaphor bridging disparate fields*.
- Look for a note which *argues that recording neural activity with EEG is challenging*.
- Find a note which *contains a formal definition related to logic*.

### Open Dialogue
- What's the easiest way to understand what pupillometry is?
- What are some important questions about affective computing?
- How could you automatically identify the core concepts of a book?

## Usage (Backend, Source)
Python 3.8+ required!
```
pip3 install -r requirements.txt
```
```
python3 server.py --path ./kb
```
```
GET 127.0.0.1:5000/<query>
```