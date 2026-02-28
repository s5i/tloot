package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"
)

var (
	listen = flag.String("listen", ":9090", "HTTP server listen spec.")
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	listen := *listen
	mux := http.NewServeMux()
	mux.Handle("/", http.HandlerFunc(staticHandler))

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

func staticHandler(w http.ResponseWriter, r *http.Request) {
	f := r.URL.Path
	if f == "/" {
		f = "/index.html"
	}

	content, err := staticData.ReadFile("static" + f)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", contentType(f))
	if _, err := w.Write(content); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

//go:embed static/*
var staticData embed.FS

func contentType(fName string) string {
	split := strings.Split(fName, ".")
	ext := split[len(split)-1]

	switch ext {
	case "", "html":
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
