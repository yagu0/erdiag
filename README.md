# erdiag: Entity-Relationship Diagrams Generator

Inspired by [this repository](https://code.google.com/archive/p/merisier/).

This parser reads ER diagrams definition files, and produces two types of diagrams + SQL code.
[Graphviz](https://www.graphviz.org/) is used on server side to translate parsed graph descriptions into SVG objects.

*Note:* at the moment, only the conceptual graph is implemented, and no comments are allowed in textual descriptions.
At least the former is planned, and also probably a way to indicate relative identifiers.

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
 * + = 1..n
 * 1 = 1..1
 * ? = 0..1

To mark a weak entity, just surround its name by extra-brackets
	[[WeakEntity]]
In the same way, a weak relation can be written
	{{WeakRelation}}
The syntax for these two last is then the same as in the non-weak versions.

To indicate an inheritance relation, proceed as follow
    is_a
		Animal Cat Fish
		Planet Mars Venus

Finally, blocks must be separated by new lines. For a usage example, see example.html

Note that the "drawMcd" method can take a second argument, which indicates the type of graph.
 * "bubble" draws the standard graph, as seen [here](https://en.wikipedia.org/wiki/Entity%E2%80%93relationship_model#/media/File:ER_Diagram_MMORPG.png) for example
 * "compact" (default) use the same box for an entity and its attributes

-----

Here is how the example file should render:

<svg width="316pt" height="327pt" viewBox="0.00 0.00 316.05 327.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g id="graph0" class="graph" transform="scale(1 1) rotate(0) translate(4 323)">
<title>%3</title>
<polygon fill="#ffffff" stroke="transparent" points="-4,4 -4,-323 312.0467,-323 312.0467,4 -4,4"></polygon>
<g id="node1" class="node">
<title>Musician</title>
<polygon fill="#ae7d4e" stroke="transparent" points="9,-191.5 9,-216.5 81,-216.5 81,-191.5 9,-191.5"></polygon>
<text text-anchor="start" x="14" y="-200.3" font-family="Roboto" font-size="14.00" fill="#ffffff">Musician</text>
<polygon fill="#ffffff" stroke="transparent" points="9,-166.5 9,-191.5 81,-191.5 81,-166.5 9,-166.5"></polygon>
<text text-anchor="start" x="14" y="-176.3" font-family="Roboto" text-decoration="underline" font-size="14.00" fill="#000000">id</text>
<polygon fill="#ffffff" stroke="transparent" points="9,-141.5 9,-166.5 81,-166.5 81,-141.5 9,-141.5"></polygon>
<text text-anchor="start" x="14" y="-150.3" font-family="Roboto" font-size="14.00" fill="#000000">name</text>
<polygon fill="#ffffff" stroke="transparent" points="9,-116.5 9,-141.5 81,-141.5 81,-116.5 9,-116.5"></polygon>
<text text-anchor="start" x="14" y="-125.3" font-family="Roboto" font-size="14.00" fill="#000000">band</text>
<polygon fill="#ffffff" stroke="transparent" points="9,-91.5 9,-116.5 81,-116.5 81,-91.5 9,-91.5"></polygon>
<text text-anchor="start" x="14" y="-100.3" font-family="Roboto" font-size="14.00" fill="#000000">role</text>
<polygon fill="none" stroke="#000000" points="8,-91 8,-218 82,-218 82,-91 8,-91"></polygon>
</g>
<g id="node5" class="node">
<title>Play</title>
<polygon fill="#d3d3d3" stroke="#d3d3d3" points="162,-36 119.9364,-18 162,0 204.0636,-18 162,-36"></polygon>
<text text-anchor="middle" x="162" y="-14.3" font-family="Roboto" font-size="14.00" fill="#000000">Play</text>
</g>
<g id="edge3" class="edge">
<title>Musician:name--Play</title>
<path fill="none" stroke="#000000" d="M82.084,-107.3354C87.6808,-100.4547 93.4413,-93.5019 99,-87 116.0765,-67.0262 136.769,-44.7006 149.6627,-30.9982"></path>
<text text-anchor="middle" x="139.5" y="-57.8" font-family="Roboto" font-size="14.00" fill="#000000">1,n</text>
</g>
<g id="node2" class="node">
<title>Instrument</title>
<polygon fill="#ae7d4e" stroke="transparent" points="118,-166.5 118,-191.5 207,-191.5 207,-166.5 118,-166.5"></polygon>
<text text-anchor="start" x="123" y="-175.3" font-family="Roboto" font-size="14.00" fill="#ffffff">Instrument</text>
<polygon fill="#ffffff" stroke="transparent" points="118,-141.5 118,-166.5 207,-166.5 207,-141.5 118,-141.5"></polygon>
<text text-anchor="start" x="123" y="-151.3" font-family="Roboto" text-decoration="underline" font-size="14.00" fill="#000000">name</text>
<polygon fill="#ffffff" stroke="transparent" points="118,-116.5 118,-141.5 207,-141.5 207,-116.5 118,-116.5"></polygon>
<text text-anchor="start" x="123" y="-125.3" font-family="Roboto" font-size="14.00" fill="#000000">family</text>
<polygon fill="none" stroke="#000000" points="116.5,-116 116.5,-193 207.5,-193 207.5,-116 116.5,-116"></polygon>
</g>
<g id="edge4" class="edge">
<title>Instrument:name--Play</title>
<path fill="none" stroke="#000000" d="M162,-115.7497C162,-89.5818 162,-56.2494 162,-36.0469"></path>
<text text-anchor="middle" x="173.5" y="-57.8" font-family="Roboto" font-size="14.00" fill="#000000">0,n</text>
</g>
<g id="node3" class="node">
<title>Piano</title>
<polygon fill="#ae7d4e" stroke="transparent" points="92,-289 92,-314 142,-314 142,-289 92,-289"></polygon>
<text text-anchor="start" x="97" y="-297.8" font-family="Roboto" font-size="14.00" fill="#ffffff">Piano</text>
<polygon fill="#ffffff" stroke="transparent" points="92,-264 92,-289 142,-289 142,-264 92,-264"></polygon>
<text text-anchor="start" x="97" y="-272.8" font-family="Roboto" font-size="14.00" fill="#000000">type</text>
<polygon fill="none" stroke="#000000" points="91,-263 91,-315 143,-315 143,-263 91,-263"></polygon>
</g>
<g id="edge1" class="edge">
<title>Piano:name--Instrument:name</title>
<path fill="none" stroke="#000000" stroke-dasharray="5,2" d="M125.7833,-262.7478C131.4763,-245.7319 139.064,-223.0533 145.823,-202.8511"></path>
<polygon fill="#000000" stroke="#000000" points="149.0627,-193.1683 150.1572,-204.0794 147.4762,-197.9099 145.8897,-202.6516 145.8897,-202.6516 145.8897,-202.6516 147.4762,-197.9099 141.6222,-201.2238 149.0627,-193.1683 149.0627,-193.1683"></polygon>
</g>
<g id="node4" class="node">
<title>Guitar</title>
<polygon fill="#ae7d4e" stroke="transparent" points="179,-289 179,-314 234,-314 234,-289 179,-289"></polygon>
<text text-anchor="start" x="184" y="-297.8" font-family="Roboto" font-size="14.00" fill="#ffffff">Guitar</text>
<polygon fill="#ffffff" stroke="transparent" points="179,-264 179,-289 234,-289 234,-264 179,-264"></polygon>
<text text-anchor="start" x="184" y="-272.8" font-family="Roboto" font-size="14.00" fill="#000000">type</text>
<polygon fill="none" stroke="#000000" points="177.5,-263 177.5,-315 234.5,-315 234.5,-263 177.5,-263"></polygon>
</g>
<g id="edge2" class="edge">
<title>Guitar:name--Instrument:name</title>
<path fill="none" stroke="#000000" stroke-dasharray="5,2" d="M197.4119,-262.7478C191.8454,-245.7319 184.4263,-223.0533 177.8175,-202.8511"></path>
<polygon fill="#000000" stroke="#000000" points="174.6499,-193.1683 182.0361,-201.2735 176.2045,-197.9205 177.7591,-202.6726 177.7591,-202.6726 177.7591,-202.6726 176.2045,-197.9205 173.4822,-204.0718 174.6499,-193.1683 174.6499,-193.1683"></polygon>
</g>
<g id="node6" class="node">
<title>Play_event</title>
<ellipse fill="none" stroke="#000000" cx="271" cy="-154.5" rx="37.0935" ry="18"></ellipse>
<text text-anchor="middle" x="271" y="-150.8" font-family="Roboto" font-size="14.00" fill="#000000">event</text>
</g>
<g id="edge5" class="edge">
<title>Play_event--Play</title>
<path fill="none" stroke="#000000" d="M259.7846,-137.157C250.5992,-123.2662 237.0373,-103.4517 224,-87 207.7962,-66.5524 187.2723,-44.3526 174.3848,-30.8066"></path>
</g>
</g>
</svg>
