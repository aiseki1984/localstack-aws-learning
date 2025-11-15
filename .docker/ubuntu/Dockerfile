# Base Image
FROM ubuntu:22.04

# バージョン設定
ARG NODE_VERSION=24
ARG PYTHON_VERSION=3.12
ENV NODE_VERSION=${NODE_VERSION}
ENV PYTHON_VERSION=${PYTHON_VERSION}

# 必要なパッケージのインストール
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        locales tzdata sudo zip unzip bzip2 p7zip-full \
        curl wget jq \
        vim git nano \
        build-essential \
        software-properties-common \
        ca-certificates gnupg \
    && apt-get autoremove -y \
    && apt-get autoclean -y \
    && apt-get clean -y

# Python のインストール（バージョン指定可能）
RUN add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y \
        python${PYTHON_VERSION} \
        python${PYTHON_VERSION}-dev \
        python${PYTHON_VERSION}-venv \
        python3-distutils \
    && curl -sS https://bootstrap.pypa.io/get-pip.py | python${PYTHON_VERSION} \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${PYTHON_VERSION} 1 \
    && update-alternatives --install /usr/bin/pip3 pip3 /usr/local/bin/pip3 1 \
    && apt-get clean

# Node.js のインストール（バージョン指定可能）
RUN mkdir -p /etc/apt/keyrings && \
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

# Terraform
RUN apt-get update && \
    apt-get install -y gnupg software-properties-common && \
    wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list && \
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

# 開発ツールの追加インストール
RUN pip3 install --upgrade pip setuptools wheel && \
    pip3 install \
        boto3 \
        awscli-local \
        pytest \
        black \
        flake8 \
        requests

# AWS CDK と TypeScript 関連のインストール
RUN npm install -g \
        aws-cdk \
        typescript \
        ts-node \
        @types/node

# Goをインストール（最新版をダウンロード）
# fontもインストール（Diagram as Codeツール用）
RUN apt-get update && \
    apt-get install -y fonts-noto-cjk fonts-noto-cjk-extra && \
    apt-get clean

# Go 1.23以降をインストール
WORKDIR /opt
RUN case "$(uname -m)" in \
        x86_64) ARCH="amd64" ;; \
        aarch64|arm64) ARCH="arm64" ;; \
        *) echo "Unsupported architecture" && exit 1 ;; \
    esac && \
    GO_VERSION="1.23.3" && \
    curl -LO "https://go.dev/dl/go${GO_VERSION}.linux-${ARCH}.tar.gz" && \
    rm -rf /usr/local/go && \
    tar -C /usr/local -xzf "go${GO_VERSION}.linux-${ARCH}.tar.gz" && \
    rm "go${GO_VERSION}.linux-${ARCH}.tar.gz"

ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/home/ubuntu/go"
ENV PATH="${GOPATH}/bin:${PATH}"




# Docker CLI
# Docker on Docker (DoD) 
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    apt-get clean

# Docker グループを GID 999 で作成（ホストの Docker ソケットのグループと一致させる）
RUN groupadd -g 999 docker && \
    useradd -u 1000 -g 100 -G sudo,docker -s /bin/bash -m -d /home/ubuntu ubuntu && \
    echo "ubuntu:ubuntu" | chpasswd

# sudo権限の設定（dockerコマンドをパスワードなしで実行可能にする）
# 注意: セキュリティ上の理由から、本番環境では推奨されません。
RUN echo 'ubuntu ALL=(ALL) NOPASSWD: /usr/bin/docker' > /etc/sudoers.d/ubuntu-nopasswd-docker && \
    chmod 440 /etc/sudoers.d/ubuntu-nopasswd-docker

# 開発環境の設定（rootユーザーで設定）
RUN echo 'export PATH="/home/ubuntu/.local/bin:$PATH"' >> /home/ubuntu/.bashrc && \
    echo 'export GOPATH="/home/ubuntu/go"' >> /home/ubuntu/.bashrc && \
    echo 'export PATH="/usr/local/go/bin:${GOPATH}/bin:$PATH"' >> /home/ubuntu/.bashrc && \
    echo 'alias aws="aws --endpoint-url=$AWS_ENDPOINT_URL"' >> /home/ubuntu/.bashrc && \
    echo 'alias awslocal="aws --endpoint-url=http://localstack:4566"' >> /home/ubuntu/.bashrc && \
    echo 'alias ll="ls -la"' >> /home/ubuntu/.bashrc && \
    echo 'alias la="ls -A"' >> /home/ubuntu/.bashrc && \
    echo 'alias l="ls -CF"' >> /home/ubuntu/.bashrc && \
    echo 'export PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/ubuntu/.bashrc && \
    chown -R ubuntu:users /home/ubuntu

USER ubuntu
WORKDIR /home/ubuntu

# GoでAWS Diagram as Codeツールをインストール
RUN go install github.com/awslabs/diagram-as-code/cmd/awsdac@latest
RUN go install github.com/awslabs/diagram-as-code/cmd/awsdac-mcp-server@latest

CMD ["bash"]
