<?php

$dotInput = $_GET["dot"];

// Call dot program on $dotInput, output as svg [TODO: offer more options]
passthru("echo '" . $dotInput . "' | dot -Tsvg -Nfontname=Roboto -Nfontsize=14 -Efontname=Roboto -Efontsize=14");

?>
