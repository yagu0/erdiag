<?php
header('Content-Type: image/png');
$dotInput = $_GET["dot"];
passthru("printf '$dotInput' | dot -Tpng -Nfontname=Roboto -Nfontsize=14 -Efontname=Roboto -Efontsize=14");
