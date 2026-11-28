# Zeichendichte für die grafische Überarbeitung

Das Testlevel nutzt Weltkoordinaten der bestehenden Simulation (eine Kachel entspricht 16 Einheiten). Die 1536 × 1024 großen Figurenatlanten haben vier Spalten und drei Reihen. Waffen dürfen in ihrer Zelle über die Körperkontur hinausragen. Anker für Hüfte und Fußsohle werden pro Pose festgelegt; die Bildmitte ist dafür ungeeignet.

Für den Ausbau dient **12 Bildpunkte pro Welteinheit bei der Asset-Produktion** als gemeinsamer Richtwert. Eine 16er-Kachel wird als 192 × 192 Pixel großes Motiv geliefert. Bei Figuren und Gegnern richtet sich die Gesamtfläche nach Ausrüstung und Körpergröße. Hintergrundsegmente bekommen genügend Bildpunkte für dieselbe Dichte bei maximaler Nahansicht. Lesbare Schrift und Menüs werden in der tatsächlichen Displayauflösung gezeichnet.

Abnahme vor dem Austausch der bisherigen Grafiken: Held, Gegner, Boden, Plattform, Projektil und eine Trefferanimation nebeneinander im selben Kameraausschnitt prüfen, in Übersicht und Nahansicht. Pixelkanten, Konturstärke und Materialdetails müssen zusammenpassen. Der Canvas verwendet eine gemeinsame Transformation für die Spielwelt. Die Bildschirmgröße darf das physische Trefferfenster, die Fußlinie und die Bewegungsdistanz nicht verändern.
