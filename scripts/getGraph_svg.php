<?php
header('Content-Type: image/svg+xml');
$dotInput = $_GET["dot"];
passthru("printf '$dotInput' | dot -Tsvg -Nfontname=Roboto -Nfontsize=14 -Efontname=Roboto -Efontsize=14");
