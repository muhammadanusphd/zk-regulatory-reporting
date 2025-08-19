OUT=build/paper
all: build
build:
	mkdir -p build
	pdflatex -output-directory build main.tex
	bibtex build/main || true
	pdflatex -output-directory build main.tex
	pdflatex -output-directory build main.tex
	mv build/main.pdf $(OUT).pdf
clean:
	rm -rf build
