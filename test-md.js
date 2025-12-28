import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';

async function testMarkdown() {
    const markdown = '# The Allure of Order: Why Dystopian Societies Are So Appealing in Fiction . why?';
    const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(markdown);

    console.log('--- HTML OUTPUT ---');
    console.log(String(file));
    console.log('-------------------');
}

testMarkdown();
