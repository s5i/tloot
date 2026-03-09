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
	mux.Handle("/", staticFallbackHandler(cfg.DynamicFilesPath))
	mux.Handle("/meta/version", versionHandler())

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

func staticFallbackHandler(dynamicFilesPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		f := strings.TrimPrefix(r.URL.Path, "/")
		if f == "" {
			f = "index.html"
		}

		content, err := func() ([]byte, error) {
			if filepath.IsLocal(f) {
				path := filepath.Join(dynamicFilesPath, f)
				if c, err := os.ReadFile(path); err == nil {
					return c, nil
				}
			}

			path := filepath.Join("static", f)
			return staticData.ReadFile(path)
		}()

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
}
func versionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := w.Write([]byte(version.Get())); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
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
