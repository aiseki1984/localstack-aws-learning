# Base Image
FROM ubuntu:22.04

# バージョン設定
ARG NODE_VERSION=20
ENV NODE_VERSION=${NODE_VERSION}

# 必要なパッケージのインストール
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        locales tzdata sudo zip unzip bzip2 p7zip-full \
        curl wget jq \
        vim git \
        python3 python3-pip \
    && apt-get autoremove -y \
    && apt-get autoclean -y \
    && apt-get clean -y

# Node.js のインストール（バージョン指定可能）
RUN apt-get update && \
    apt-get install -y ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" | \
    tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean

# localesの設定
RUN localedef -f UTF-8 -i ja_JP ja_JP.UTF-8
ENV LANG="ja_JP.UTF-8" \
    LANGUAGE="ja_JP:ja" \
    LC_ALL="ja_JP.UTF-8"

# AWSCLIv2 - アーキテクチャに応じて自動選択
WORKDIR /opt
RUN case "$(uname -m)" in \
        x86_64) ARCH="x86_64" ;; \
        aarch64|arm64) ARCH="aarch64" ;; \
        *) echo "Unsupported architecture" && exit 1 ;; \
    esac && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip
RUN apt-get install -y groff

# AWS SDK
RUN pip3 install boto3

# Terraform
RUN apt-get update && \
    apt-get install -y gnupg software-properties-common && \
    wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    tee /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    tee /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update && \
    apt-get install -y terraform && \
    apt-get clean

# SAM CLI - アーキテクチャに応じて自動選択
WORKDIR /opt
RUN case "$(uname -m)" in \
        x86_64) ARCH="x86_64" ;; \
        aarch64|arm64) ARCH="arm64" ;; \
        *) echo "Unsupported architecture" && exit 1 ;; \
    esac && \
    curl -L "https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-${ARCH}.zip" -o "aws-sam-cli.zip" && \
    unzip aws-sam-cli.zip && \
    ./install && \
    rm -rf aws-sam-cli.zip install

RUN useradd -u 1000 -g 100 -G sudo -s /bin/bash -d /home/ubuntu ubuntu && \
    echo "ubuntu:ubuntu" | chpasswd

USER ubuntu
WORKDIR /home/ubuntu

CMD ["bash"]
