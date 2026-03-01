FROM --platform=$BUILDPLATFORM golang:alpine AS build
ARG TARGETOS TARGETARCH TAGVERSION

WORKDIR /src
COPY --from=github . .
WORKDIR /build
RUN GOOS=js GOARCH=wasm go build -C /src/wasm/ -o /src/static/main.wasm .
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -C /src/ -o /build/tloot.app -ldflags "-X 'github.com/s5i/goutil/version.External=${TAGVERSION}'" .

FROM alpine
COPY --from=build /src/entrypoint.sh /app/entrypoint.sh
COPY --from=build /build/tloot.app /app/tloot.app
CMD [ "/app/entrypoint.sh" ]
ENTRYPOINT /app/entrypoint.sh
