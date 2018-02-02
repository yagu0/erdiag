# erdiag: Entity-Relationship Diagrams Generator

Inspired by [this repository](https://code.google.com/archive/p/merisier/).

This parser reads ER diagrams definition files, and produces two types of diagrams + SQL code.
[Graphviz](https://www.graphviz.org/) is used on server side to translate parsed graph descriptions into SVG objects.

**TODO** list:

 - functional integrity constraints (CIF),
 - inter-relations constraints (or, and, xor...),
 - inheritance with the right symbol (triangle).

*Note:* temporary dependency to [underscore](http://underscorejs.org/); good library but used so far only for its shuffle() method.

-----

An entity is defined as follow

	[Entity]
	#attr1 (*)
	attr2 (*)

with (\*) = optional SQL indications, and # denoting a (part of) a key.

A relationship is defined in this way

	{Relation}
	Entity C1
	Entity2 C2
	--
	attr1 (*)
	attr2 (*)

where attributes are optional, and C1 (resp. C2) = cardinality for entity 1 (resp. 2).
Defining relationships with more than two attributes is easy: just add entities.
Cardinality dictionary:
 * \* = 0..n
 * \+ = 1..n
 * 1 = 1..1
 * ? = 0..1

Special cardinalities are also available to indicate relative identification: `?R` and `1R`.

To mark a weak entity, just surround its name by extra-brackets

	[[WeakEntity]]

In the same way, a weak relation can be written

	{{WeakRelation}}

The syntax for these two last is then the same as in the non-weak versions.

To indicate an inheritance relation, proceed as follow

	is_a
	Animal Cat Fish
	Planet Mars Venus

Finally, blocks must be separated by new lines. For a usage example, see example.html (it should render as seen in example\_\*.svg)

Note that the "drawMcd" method can take a second argument, which indicates the type of graph.
 * "bubble" draws the standard graph, as seen [here](https://en.wikipedia.org/wiki/Entity%E2%80%93relationship_model#/media/File:ER_Diagram_MMORPG.png) for example
 * "compact" (default) use the same box for an entity and its attributes
