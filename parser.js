// ER diagram description parser
class ErDiags
{
	constructor(description, output, image)
	{
		this.entities = { };
		this.inheritances = [ ];
		this.associations = [ ];
		this.tables = { };
		this.mcdParsing(description);
		this.mldParsing();
		this.output = output || "compact";
		this.image = image || "svg";
	}

	static CARDINAL(symbol)
	{
		let res = { "*": "0,n", "+": "1,n", "?": "0,1", "1": "1,1" } [ symbol[0] ];
		if (symbol.length >= 2)
		{
			if (symbol[1] == 'R')
				res = '(' + res + ')';
			else if (['>','<'].includes(symbol[1]))
				res += symbol[1];
		}
		return res;
	}

	///////////////////////////////
	// PARSING STAGE 1: text to MCD
	///////////////////////////////

	// Parse a textual description into a json object
	mcdParsing(text)
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
				let name = lines[start].match(/[^\[\]"\s]+/)[0];
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
				let nameRes = lines[start].match(/[^{}"\s]+/);
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
		let attributes = [ ];
		for (let i=start; i<end; i++)
		{
			let field = { };
			let line = lines[i];
			if (line.charAt(0) == '+')
			{
				field.isKey = true;
				line = line.slice(1);
			}
			field.name = line.match(/[^"\s]+/)[0];
			let sqlClues = line.substring(field.name.length).trim();
			if (sqlClues.length > 0)
			{
				field.type = sqlClues.match(/[^\s]+/)[0]; //type is always the first indication (mandatory)
				field.qualifiers = sqlClues.substring(field.type.length);
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

	// Association (parsed here): {
	//   entities: ArrayOf entity names + cardinality,
	//   [attributes: ArrayOf {name, [isKey], [type], [qualifiers]}]
	// }
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

	//////////////////////////////
	// PARSING STAGE 2: MCD to MLD
	//////////////////////////////

	// From entities + relationships to tables
	mldParsing()
	{
		// Pass 1: initialize tables
		Object.keys(this.entities).forEach( name => {
			let newTable = [ ]; //array of fields
			this.entities[name].attributes.forEach( attr => {
				let newField = {
					name: attr.name,
					type: attr.type,
					isKey: attr.isKey,
				};
				if (!!attr.qualifiers && !!attr.qualifiers.match(/references/i))
				{
					Object.assign(newField, {ref: attr.qualifiers.match(/references ([^\s]+)/i)[1]});
					newField.qualifiers = attr.qualifiers.replace(/references [^\s]+/i, "");
				}
				newTable.push(newField);
			});
			this.tables[name] = newTable;
		});
		// Add foreign keys information for children (inheritance). TODO: allow several levels
		// NOTE: modelisation assume each child has its own table, refering parent (other options exist)
		this.inheritances.forEach( inh => {
			let idx = this.tables[inh.parent].findIndex( item => { return item.isKey; });
			inh.children.forEach( c => {
				this.tables[c].push({
					name: inh.parent + "_id",
					type: this.tables[inh.parent][idx].type,
					isKey: true,
					qualifiers: this.tables[inh.parent][idx].qualifiers || "",
					ref: inh.parent + "(" + this.tables[inh.parent][idx].name + ")",
				});
			});
		});
		// Pass 2: parse associations, add foreign keys when cardinality is 0,1 or 1,1
		this.associations.forEach( a => {
			let newTableAttrs = [ ];
			let hasZeroOne = false;
			a.entities.forEach( e => {
				if (['?','1'].includes(e.card[0]))
				{
					hasZeroOne = true;
					// Foreign key apparition (for each entity in association minus current one, for each identifying attribute)
					a.entities.forEach( e2 => {
						if (e2.name == e.name)
							return;
						this.entities[e2.name].attributes.forEach( attr => {
							if (attr.isKey)
							{
								// For "weak tables", foreign keys become part of the key
								const isKey = e.card.length >= 2 && e.card[1] == 'R';
								this.tables[e.name].push({
									isKey: isKey,
									name: e2.name + "_" + attr.name,
									type: attr.type,
									qualifiers: !isKey && e.card[0]=='1' ? "not null" : "",
									ref: e2.name + "(" + attr.name + ")",
								});
							}
						});
					});
				}
				else
				{
					// Add all keys in current entity
					let fields = this.entities[e.name].attributes.filter( attr => { return attr.isKey; });
					newTableAttrs.push({
						fields: fields,
						entity: e.name,
					});
				}
			});
			if (!hasZeroOne && newTableAttrs.length > 1)
			{
				// Ok, really create a new table
				let newTable = {
					name: a.name || newTableAttrs.map( item => { return item.entity; }).join("_"),
					fields: [ ],
				};
				newTableAttrs.forEach( item => {
					item.fields.forEach( f => {
						newTable.fields.push({
							name: item.entity + "_" + f.name,
							isKey: true,
							type: f.type,
							qualifiers: f.qualifiers || "",
							ref: item.entity + "(" + f.name + ")",
						});
					});
				});
				// Check for duplicates (in case of self-relationship), rename if needed
				newTable.fields.forEach( (f,i) => {
					const idx = newTable.fields.findIndex( item => { return item.name == f.name; });
					if (idx < i)
					{
						// Current field is a duplicate
						let suffix = 2;
						let newName = f.name + suffix;
						while (newTable.fields.findIndex( item => { return item.name == newName; }) >= 0)
						{
							suffix++;
							newName = f.name + suffix;
						}
						f.name = newName;
					}
				});
				// Add relationship potential own attributes
				(a.attributes || [ ]).forEach( attr => {
					newTable.fields.push({
						name: attr.name,
						isKey: false,
						type: attr.type,
						qualifiers: attr.qualifiers,
					});
				});
				this.tables[newTable.name] = newTable.fields;
			}
		});
	}

	/////////////////////////////////
	// DRAWING + GET SQL FROM PARSING
	/////////////////////////////////

	// "Modèle conceptuel des données". TODO: option for graph size
	// NOTE: randomizing helps to obtain better graphs (sometimes)
	drawMcd(id, mcdStyle) //mcdStyle: bubble, or compact
	{
		let element = document.getElementById(id);
		mcdStyle = mcdStyle || "compact";
		// Build dot graph input
		let mcdDot = 'graph {\n';
		mcdDot += 'rankdir="LR";\n';
		// Nodes:
		if (mcdStyle == "compact")
			mcdDot += 'node [shape=plaintext];\n';
		_.shuffle(Object.keys(this.entities)).forEach( name => {
			if (mcdStyle == "bubble")
			{
				mcdDot += '"' + name + '" [shape=rectangle, label="' + name + '"';
				if (this.entities[name].weak)
					mcdDot += ', peripheries=2';
				mcdDot += '];\n';
				if (!!this.entities[name].attributes)
				{
					this.entities[name].attributes.forEach( a => {
						let label = (a.isKey ? '#' : '') + a.name;
						let attrName = name + '_' + a.name;
						mcdDot += '"' + attrName + '" [shape=ellipse, label="' + label + '"];\n';
						if (Math.random() < 0.5)
							mcdDot += '"' + attrName + '" -- "' + name + '";\n';
						else
							mcdDot += '"' + name + '" -- "' + attrName + '";\n';
					});
				}
			}
			else
			{
				mcdDot += '"' + name + '" [label=<';
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
		_.shuffle(this.inheritances).forEach( i => {
			// TODO: node shape = triangle fill yellow. See
			// https://merise.developpez.com/faq/?page=MCD#CIF-ou-dependance-fonctionnelle-de-A-a-Z
			// https://merise.developpez.com/faq/?page=MLD#Comment-transformer-un-MCD-en-MLD
			// https://www.developpez.net/forums/d1088964/general-developpement/alm/modelisation/structure-agregation-l-association-d-association/
			_.shuffle(i.children).forEach( c => {
				if (Math.random() < 0.5)
					mcdDot += '"' + c + '":name -- "' + i.parent + '":name [dir="forward",arrowhead="vee",';
				else
					mcdDot += '"' + i.parent + '":name -- "' + c + '":name [dir="back",arrowtail="vee",';
				mcdDot += 'style="dashed"];\n';
			});
		});
		// Relationships:
		if (mcdStyle == "compact")
			mcdDot += 'node [shape=rectangle, style=rounded];\n';
		let assoceCounter = 0;
		_.shuffle(this.associations).forEach( a => {
			let name = a.name || "_assoce" + assoceCounter++;
			if (mcdStyle == "bubble")
			{
				mcdDot += '"' + name + '" [shape="diamond", style="filled", color="lightgrey", label="' + name + '"';
				if (a.weak)
					mcdDot += ', peripheries=2';
				mcdDot += '];\n';
				if (!!a.attributes)
				{
					a.attributes.forEach( attr => {
						let label = (attr.isKey ? '#' : '') + attr.name;
						mcdDot += '"' + name + '_' + attr.name + '" [shape=ellipse, label="' + label + '"];\n';
						let attrName = name + '_' + attr.name;
						if (Math.random() < 0.5)
							mcdDot += '"' + attrName + '" -- "' + name + '";\n';
						else
							mcdDot += '"' + name + '" -- "' + attrName + '";\n';
					});
				}
			}
			else
			{
				let label = '<' + name + '>';
				if (!!a.attributes)
				{
					a.attributes.forEach( attr => {
						let attrLabel = (attr.isKey ? '#' : '') + attr.name;
						label += '\\n' + attrLabel;
					});
				}
				mcdDot += '"' + name + '" [color="lightgrey", label="' + label + '"';
				if (a.weak)
					mcdDot += ', peripheries=2';
				mcdDot += '];\n';
			}
			_.shuffle(a.entities).forEach( e => {
				if (Math.random() < 0.5)
					mcdDot += '"' + e.name + '":name -- "' + name + '"';
				else
					mcdDot += '"' + name + '" -- "' + e.name + '":name';
				mcdDot += '[label="' + ErDiags.CARDINAL(e.card) + '"];\n';
			});
		});
		mcdDot += '}';
		if (this.output == "graph") //draw graph in element
			element.innerHTML = "<img src='scripts/getGraph_" + this.image + ".php?dot=" + encodeURIComponent(mcdDot) + "'/>";
		else //just show dot input
			element.innerHTML = mcdDot.replace(/</g,"&lt;").replace(/>/g,"&gt;");
	}

	// "Modèle logique des données", from MCD without anomalies
	drawMld(id)
	{
		let element = document.getElementById(id);
		// Build dot graph input (assuming foreign keys not already present...)
		let mldDot = 'graph {\n';
		mldDot += 'rankdir="LR";\n';
		mldDot += 'node [shape=plaintext];\n';
		let links = "";
		_.shuffle(Object.keys(this.tables)).forEach( name => {
			mldDot += '"' + name + '" [label=<<table BORDER="1" ALIGN="LEFT" CELLPADDING="5" CELLSPACING="0">\n';
			mldDot += '<tr><td BGCOLOR="#ae7d4e" BORDER="0"><font COLOR="#FFFFFF">' + name + '</font></td></tr>\n';
			this.tables[name].forEach( f => {
				let label = (f.isKey ? '<u>' : '') + (!!f.ref ? '#' : '') + f.name + (f.isKey ? '</u>' : '');
				mldDot += '<tr><td port="' + f.name + '"' + ' BGCOLOR="#FFFFFF" BORDER="0" ALIGN="LEFT"><font COLOR="#000000" >' + label + '</font></td></tr>\n';
				if (!!f.ref)
				{
					const refPort = f.ref.slice(0,-1).replace('(',':');
					if (Math.random() < 0.5)
						links += refPort + ' -- "' + name+'":"'+f.name + '" [dir="forward",arrowhead="dot"';
					else
						links += '"'+name+'":"'+f.name+'" -- ' + refPort + ' [dir="back",arrowtail="dot"';
					links += ']\n;';
				}
			});
			mldDot += '</table>>];\n';
		});
		mldDot += links + '\n';
		mldDot += '}';
		if (this.output == "graph")
			element.innerHTML = "<img src='scripts/getGraph_" + this.image + ".php?dot=" + encodeURIComponent(mldDot) + "'/>";
		else
			element.innerHTML = mldDot.replace(/</g,"&lt;").replace(/>/g,"&gt;");
	}

	fillSql(id)
	{
		let element = document.getElementById(id);
		if (!!this.sqlText)
		{
			element.innerHTML = this.sqlText;
			return;
		}
		let sqlText = "";
		Object.keys(this.tables).forEach( name => {
			sqlText += "CREATE TABLE " + name + " (\n";
			let key = "";
			let foreignKey = [ ];
			this.tables[name].forEach( f => {
				let type = f.type || (f.isKey ? "INTEGER" : "TEXT");
				if (!!f.ref)
					foreignKey.push({name: f.name, ref: f.ref});
				sqlText += "\t" + f.name + " " + type + " " + (f.qualifiers || "") + ",\n";
				if (f.isKey)
					key += (key.length>0 ? "," : "") + f.name;
			});
			sqlText += "\tPRIMARY KEY (" + key + ")";
			foreignKey.forEach( f => {
				let refParts = f.ref.split("(");
				const table = refParts[0];
				const field = refParts[1].slice(0,-1); //remove last parenthesis
				sqlText += ",\n\tFOREIGN KEY (" + f.name + ") REFERENCES " + table + "(" + field + ")";
			});
			sqlText += "\n);\n";
		});
		this.sqlText = sqlText;
		element.innerHTML = "<pre><code>" + sqlText + "</code></pre>";
	}
}
