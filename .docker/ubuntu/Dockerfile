# Base Image
FROM ubuntu:22.04

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

RUN useradd -u 1000 -g 100 -G sudo -s /bin/bash -d /home/ubuntu ubuntu && \
    echo "ubuntu:ubuntu" | chpasswd

USER ubuntu
WORKDIR /home/ubuntu

CMD ["bash"]
