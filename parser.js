// ER diagram description parser
class ErDiags
{
	constructor(description)
	{
		this.entities = {};
		this.inheritances = [];
		this.associations = [];
		this.txt2json(description);
		this.tables = [];
		// Cache SVG graphs returned by server (in addition to server cache = good perfs)
		this.mcdGraph = "";
		this.mldGraph = "";
		this.sqlText = "";
	}

	static get TYPES()
	{
		// SQLite storage classes without null
		return ["integer","real","text","blob"];
	}

	static get CARDINAL()
	{
		return {
			"*": "0,n",
			"+": "1,n",
			"?": "0,1",
			"1": "1,1"
		};
	}

	//////////////////
	// PARSING STAGE 1
	//////////////////

	// Parse a textual description into a json object
	txt2json(text)
	{
		let lines = text.split("\n");
		lines.push(""); //easier parsing: always empty line at the end
		let start = -1;
		for (let i=0; i < lines.length; i++)
		{
			lines[i] = lines[i].trim();
			// Empty line ?
			if (lines[i].length == 0)
			{
				if (start >= 0) //there is some group of lines to parse
				{
					this.parseThing(lines, start, i);
					start = -1;
				}
			}
			else //not empty line: just register starting point
			{
				if (start < 0)
					start = i;
			}
		}
	}

	// Parse a group of lines into entity, association, ...
	parseThing(lines, start, end) //start included, end excluded
	{
		switch (lines[start].charAt(0))
		{
			case '[':
				// Entity = { name: { attributes, [weak] } }
				let name = lines[start].match(/[^\[\]\s]+/)[0];
				let entity = { attributes: this.parseAttributes(lines, start+1, end) };
				if (lines[start].charAt(1) == '[')
					entity.weak = true;
				this.entities[name] = entity;
				break;
			case 'i': //inheritance (arrows)
				this.inheritances = this.inheritances.concat(this.parseInheritance(lines, start+1, end));
				break;
			case '{': //association
				// Association = { [name], [attributes], [weak], entities: ArrayOf entity indices }
				let relationship = { };
				let nameRes = lines[start].match(/[^{}\s]+/);
				if (nameRes !== null)
					relationship.name = nameRes[0];
				if (lines[start].charAt(1) == '{')
					relationship.weak = true;
				this.associations.push(Object.assign({}, relationship, this.parseAssociation(lines, start+1, end)));
				break;
		}
	}

	// attributes: ArrayOf {name, [isKey], [type], [qualifiers]}
	parseAttributes(lines, start, end)
	{
		let attributes = [];
		for (let i=start; i<end; i++)
		{
			let field = { };
			let line = lines[i];
			if (line.charAt(0) == '#')
			{
				field.isKey = true;
				line = line.slice(1);
			}
			field.name = line.match(/[^()\s]+/)[0];
			let parenthesis = line.match(/\((.+)\)/);
			if (parenthesis !== null)
			{
				let sqlClues = parenthesis[1];
				let qualifiers = sqlClues;
				let firstWord = sqlClues.match(/[^\s]+/)[0];
				if (ErDiags.TYPES.includes(firstWord))
				{
					field.type = firstWord;
					qualifiers = sqlClues.substring(firstWord.length).trim();
				}
				field.qualifiers = qualifiers;
			}
			attributes.push(field);
		}
		return attributes;
	}

	// GroupOf Inheritance: { parent, children: ArrayOf entity indices }
	parseInheritance(lines, start, end)
	{
		let inheritance = [];
		for (let i=start; i<end; i++)
		{
			let lineParts = lines[i].split(" ");
			let children = [];
			for (let j=1; j<lineParts.length; j++)
				children.push(lineParts[j]);
			inheritance.push({ parent:lineParts[0], children: children });
		}
		return inheritance;
	}

	// Association (parsed here): { entities: ArrayOf entity names + cardinality, [attributes: ArrayOf {name, [isKey], [type], [qualifiers]}] }
	parseAssociation(lines, start, end)
	{
		let assoce = { };
		let entities = [];
		let i = start;
		while (i < end)
		{
			if (lines[i].charAt(0) == '-')
			{
				assoce.attributes = this.parseAttributes(lines, i+1, end);
				break;
			}
			else
			{
				// Read entity name + cardinality
				let lineParts = lines[i].split(" ");
				entities.push({ name:lineParts[0], card:lineParts[1] });
			}
			i++;
		}
		assoce.entities = entities;
		return assoce;
	}

	//////////////////
	// PARSING STAGE 2
	//////////////////

	static AjaxGet(dotInput, callback)
	{
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200)
				callback(this.responseText);
		};
		xhr.open("GET", "scripts/getGraphSvg.php?dot=" + encodeURIComponent(dotInput), true);
		xhr.send();
	}

	// "Modèle conceptuel des données". TODO: option for graph size
	// NOTE: randomizing helps to obtain better graphs (sometimes)
	drawMcd(id, mcdStyle) //mcdStyle: bubble, or compact
	{
		let element = document.getElementById(id);
		mcdStyle = mcdStyle || "compact";
		if (this.mcdGraph.length > 0)
		{
			element.innerHTML = this.mcdGraph;
			return;
		}
		// Build dot graph input
		let mcdDot = 'graph {\n';
		mcdDot += 'rankdir="LR";\n';
		// Nodes:
		if (mcdStyle == "compact")
			mcdDot += "node [shape=plaintext];\n";
		_.shuffle(Object.keys(this.entities)).forEach( name => {
			if (mcdStyle == "bubble")
			{
				mcdDot += name + '[shape=rectangle, label="' + name + '"';
				if (this.entities[name].weak)
					mcdDot += ', peripheries=2';
				mcdDot += '];\n';
				if (!!this.entities[name].attributes)
				{
					_.shuffle(this.entities[name].attributes).forEach( a => {
						let label = (a.isKey ? '#' : '') + a.name;
						let attrName = name + '_' + a.name;
						mcdDot += attrName + '[shape=ellipse, label="' + label + '"];\n';
						if (Math.random() < 0.5)
							mcdDot += attrName + ' -- ' + name + ';\n';
						else
							mcdDot += name + ' -- ' + attrName + ';\n';
					});
				}
			}
			else
			{
				mcdDot += name + '[label=<';
				if (this.entities[name].weak)
				{
					mcdDot += '<table port="name" BORDER="1" ALIGN="LEFT" CELLPADDING="0" CELLSPACING="3" CELLBORDER="0">' +
						'<tr><td><table BORDER="1" ALIGN="LEFT" CELLPADDING="5" CELLSPACING="0">\n';
				}
				else
					mcdDot += '<table port="name" BORDER="1" ALIGN="LEFT" CELLPADDING="5" CELLSPACING="0">\n';
				mcdDot += '<tr><td BGCOLOR="#ae7d4e" BORDER="0"><font COLOR="#FFFFFF">' + name + '</font></td></tr>\n';
				if (!!this.entities[name].attributes)
				{
					this.entities[name].attributes.forEach( a => {
						let label = (a.isKey ? '<u>' : '') + a.name + (a.isKey ? '</u>' : '');
						mcdDot += '<tr><td BGCOLOR="#FFFFFF" BORDER="0" ALIGN="LEFT"><font COLOR="#000000" >' + label + '</font></td></tr>\n';
					});
				}
				mcdDot += '</table>';
				if (this.entities[name].weak)
					mcdDot += '</td></tr></table>';
				mcdDot += '>];\n';
			}
		});
		// Inheritances:
		this.inheritances.forEach( i => {
			_.shuffle(i.children).forEach( c => {
				if (Math.random() < 0.5)
					mcdDot += c + ':name -- ' + i.parent;
				else
					mcdDot += i.parent + ':name -- ' + c;
				mcdDot += ':name [dir="forward", arrowhead="vee", style="dashed"];\n';
			});
		});
		// Relationships:
		let assoceCounter = 0;
		_.shuffle(this.associations).forEach( a => {
			let name = !!a.name && a.name.length > 0
				? a.name
				: '_assoce' + assoceCounter++;
			mcdDot += name + '[shape="diamond", style="filled", color="lightgrey", label="' + (!!a.name ? a.name : '') + '"';
			if (a.weak)
				mcdDot += ', peripheries=2';
			mcdDot += '];\n';
			_.shuffle(a.entities).forEach( e => {
				if (Math.random() < 0.5)
					mcdDot += e.name + ':name -- ' + name;
				else
					mcdDot += name + ':name -- ' + e.name;
				mcdDot += '[label="' + ErDiags.CARDINAL[e.card] + '"];\n';
			});
			if (!!a.attributes)
			{
				_.shuffle(a.attributes).forEach( attr => {
					let label = (attr.isKey ? '#' : '') + attr.name;
					mcdDot += name + '_' + attr.name + '[shape=ellipse, label="' + label + '"];\n';
					let attrName = name + '_' + attr.name;
					if (Math.random() < 0.5)
						mcdDot += attrName + ' -- ' + name + ';\n';
					else
						mcdDot += name + ' -- ' + attrName + ';\n';
				});
			}
		});
		mcdDot += '}';
		console.log(mcdDot);
		ErDiags.AjaxGet(mcdDot, graphSvg => {
			this.mcdGraph = graphSvg;
			element.innerHTML = graphSvg;
		});
	}

	// "Modèle logique des données"
	// TODO: this one should draw links from foreign keys to keys (port=... in <TD>)
	drawMld(id)
	{
		let element = document.getElementById(id);
		if (this.mldGraph.length > 0)
		{
			element.innerHTML = this.mcdGraph;
			return;
		}
		// Build dot graph input
		let mldDot = 'graph {\n';
		// Nodes:
		Object.keys(this.entities).forEach( name => {
			//mld. ... --> devient table
			// mldDot = ...
		});
		// Relationships:
		this.associations.forEach( a => {
			a.entities.forEach( e => { // e.card e.name ...
				// Pass 1 : entites deviennent tables
				// Pass 2 : sur les assoces
				// multi-arite : sub-loop si 0,1 ou 1,1 : aspiré comme attribut de l'association (phase 1)
				// ensuite, que du 0,n ou 1,n : si == 1, OK une table
				// si 2 ou + : n tables + 1 pour l'assoce, avec attrs clés étrangères
				// clé étrangère NOT NULL si 1,1
			});
		});
		// this.graphMld = ...
		//console.log(mldDot);
		ErDiags.AjaxGet(mldDot, graphSvg => {
			this.mldGraph = graphSvg;
			element.innerHTML = graphSvg;
		});
	}

	fillSql(id)
	{
		let element = document.getElementById(id);
		if (this.sqlText.length > 0)
		{
			element.innerHTML = this.sqlText;
			return;
		}
		//UNIMPLEMENTED (should be straightforward from MLD)
	}
}
