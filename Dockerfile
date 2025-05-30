FROM ubuntu:24.04

ARG USER_ID=1000
ARG GROUP_ID=1000

RUN apt update && apt install -y curl tini unzip
ENTRYPOINT ["/usr/bin/tini", "--"]

# Install Node.js LTS (use setup script)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt install -y nodejs

RUN chown -R $USER_ID:$GROUP_ID /tmp
RUN mkdir /var/log/yellow
RUN chown $USER_ID:$GROUP_ID /var/log/yellow

ARG APP_DIR=/app/app/
RUN mkdir -p $APP_DIR
RUN chown $USER_ID:$GROUP_ID $APP_DIR
RUN mkdir /.bun
RUN chown $USER_ID:$GROUP_ID /.bun
USER $USER_ID:$GROUP_ID
WORKDIR $APP_DIR

RUN curl -fsSL https://bun.sh/install | bash

