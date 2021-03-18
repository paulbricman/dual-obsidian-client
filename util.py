from markdown import markdown
from bs4 import BeautifulSoup
import frontmatter

def md_to_text(file):
    """Extract text from markdown file which contains front matter."""
    content = frontmatter.load(file)
    content.metadata = ''
    content = markdown(frontmatter.dumps(content))
    content = BeautifulSoup(content, features='html.parser')
    content = content.get_text()[4:]
    return content