import assert from 'assert';

function chapterTemplate({ number, name, content }) {
	assert(number, 'Chapter must have a number');
	assert(name, 'Chapter must have a name');
	assert(content, 'Chapter must have content');

	return `<h2 class="chapter">Chapter ${number}${name ? `: ${name}` : ''}</h2>${content}`;
}

function headerTemplate({
	title,
	link,
	category,
	genre,
	author,
	authorlink,
	lastUpdated,
	wordsCount,
	rating,
	status,
	content,
	source,
	summary,
}) {
	assert(title, 'Story must have a title');
	assert(link, 'Story must have a link');

	return `<br/><br/>
<div style="text-align:center">
	<h1>${title}</h1>
</div>
<br/><br/>
<b>Story:</b><a href="${link}">${title}</a><br/>
<b>Category:</b>${category}<br/>
<b>Genre:</b>${genre}<br/>
<b>Author:</b><a href="${authorlink}">${author}</a><br/>
<b>Last updated:</b>${lastUpdated}<br/>
<b>Words:</b>${wordsCount}<br/>
<b>Rating:</b>${rating}<br/>
<b>Status:</b>${status}<br/>
<b>Content:</b>${content}<br/>
<b>Source:</b>${source}<br/>
<b>Summary:</b>${summary}<br/>`;
}

export function pageTemplate(state) {
	return `
<html>
	<head>
		<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8"/>
		<meta name="author" content="${state.infos.author}"/>
		<title>${state.infos.author ? `${state.infos.author}: ` : ''}${state.infos.title}</title>
	</head>
	<body>

		${headerTemplate(state.infos)}

		<!--CHAPTERAREA START-->
		${state.chapters.reduce((acc, chapter) => `${acc}${chapterTemplate(chapter)}<br/>`, '')}
		<!--CHAPTERAREA STOP-->

	</body>
</html>`;
}
