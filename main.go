package main

import (
	"compress/gzip"
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/s5i/goutil/version"
)

var (
	fConfig  = flag.String("config", defaultConfigPath(), "Path to config file.")
	fVersion = flag.Bool("version", false, "When true, print version and exit.")
)

func main() {
	flag.Parse()

	if *fVersion {
		fmt.Fprintln(os.Stderr, version.Get())
		os.Exit(0)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := ReadConfig(*fConfig)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	listen := cfg.ProvidedEndpoints.UI
	mux := http.NewServeMux()
	mux.Handle("/", http.HandlerFunc(staticHandler))
	mux.Handle("/d/", noCache(http.StripPrefix("/d", http.FileServer(http.Dir(cfg.DynamicFilesPath)))))

	srv := http.Server{
		Addr:    listen,
		Handler: mux,
	}

	go func() {
		<-ctx.Done()
		srv.Shutdown(ctx)
	}()

	switch err := srv.ListenAndServe(); {
	case err == nil:
	case errors.Is(err, http.ErrServerClosed):
	default:
		fmt.Fprintf(os.Stderr, "srv.ListenAndServe failed: %v", err)
		os.Exit(1)
	}
}

func noCache(h http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, private, max-age=0")
		h.ServeHTTP(w, r)
	}
}

func staticHandler(w http.ResponseWriter, r *http.Request) {
	f := r.URL.Path
	if f == "/" {
		f = "/index.html"
	}

	content, err := staticData.ReadFile(filepath.Join("static", f))
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", contentType(f))

	var writer io.Writer = w
	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		writer = gz
	}

	if _, err := writer.Write(content); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

//go:embed static/*
var staticData embed.FS

func contentType(fName string) string {
	switch strings.TrimPrefix(filepath.Ext(fName), ".") {
	case "html":
		return "text/html"
	case "js":
		return "application/javascript"
	case "css":
		return "text/css"
	case "wasm":
		return "application/wasm"
	default:
		return "text/plain"
	}
}
