from markdown import markdown
from bs4 import BeautifulSoup
import frontmatter
import re

def md_to_text(file):
    """Extract text from markdown file which contains front matter."""
    content = frontmatter.load(file)
    content.metadata = ''
    content = frontmatter.dumps(content)
    content = re.sub(r'\[\[[^\|]*\|([^\]]*)\]\]', '\g<1>' , content)
    content = re.sub(r'\[\[(.*)\]\]', '\g<1>', content)
    content = markdown(content)
    content = BeautifulSoup(content, features='html.parser')
    content = content.get_text()[4:]
    return content