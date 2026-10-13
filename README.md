# Votação cloud native

Este projeto mostra um fluxo assíncrono inteiro, da interface até a contagem. O serviço **vote** recebe uma escolha e coloca o evento no Redis; um **worker** consome a fila e atualiza o placar; **results** lê o resultado. Separei os processos para observar o que ocorre quando o worker atrasa ou quando o Redis não está pronto.

## Rodar no computador

`docker compose up --build --wait` e abra `http://localhost:3000`. A contagem está em `http://localhost:3001/results` e pode levar alguns segundos após o voto. `npm test` executa testes locais de protocolo e entradas. `docker compose down --volumes` remove também os dados de homologação.

## Kubernetes

O diretório `k8s/` traz Namespace, Service, StatefulSet com volume e Deployments com probes e limites. Primeiro publique sua própria imagem no registry e troque a referência `ghcr.io/glaucojr17/cloud-native-voting-lab:v1.0.0` por uma imagem existente e imutável. Depois: `kubectl apply -k k8s/`; aguarde `kubectl -n voting-lab get pods` e use `kubectl -n voting-lab port-forward svc/vote 3000:80` e `kubectl -n voting-lab port-forward svc/results 3001:80` em terminais separados.

O CI executa teste unitário e um voto completo no Compose. O manifesto Kubernetes é conferido estruturalmente no repositório, mas **não** foi aplicado em um cluster real neste laboratório.

## O que ainda faria antes de produção

- Uma lista com `BRPOP` retira o voto antes de atualizar o placar. Se o worker cair nesse intervalo, pode haver perda. Para entrega garantida, eu migraria para Redis Streams com consumer group e ACK, além de idempotência.
- Redis aqui é uma instância única com AOF; não há alta disponibilidade, autenticação de usuários, prevenção de votos duplicados nem TLS. Restringir a rede interna e definir controles de acesso são passos necessários.
- O redirecionamento “Ver resultados” aponta para localhost, útil no Compose; em ingress real, configure `RESULTS_URL` para a rota externa do serviço results.

Ideia baseada na “Cloud-Native Voting App” do [short de Vishakha Sadhwani](https://www.youtube.com/watch?v=79jr3CgBY-Q); implementação e documentação feitas para homologação, sem dados corporativos.
