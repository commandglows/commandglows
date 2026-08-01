#!/usr/bin/env sh
# Bootstrap ShipGlowz without a manual git clone.

set -eu

REPO_URL="${SHIPGLOWZ_REPO_URL:-${SHIPFLOW_REPO_URL:-https://github.com/dianedef/shipglowz.git}}"
BRANCH="${SHIPGLOWZ_BRANCH:-${SHIPFLOW_BRANCH:-main}}"
REQUESTED_MODE="${SHIPGLOWZ_INSTALL_MODE:-${SHIPFLOW_INSTALL_MODE:-}}"
PUBLIC_INSTALL_URL="${SHIPGLOWZ_INSTALL_URL:-https://www.winflowz.com/shipglowz-script}"
CURRENT_UID="$(id -u)"
CURRENT_USER="$(id -un 2>/dev/null || printf '%s' "${USER:-unknown}")"
IS_TERMUX=false

case "${TERMUX_VERSION:-}:${PREFIX:-}" in
    ?*:*|*:*/com.termux/*) IS_TERMUX=true ;;
esac

log() {
    printf '%s\n' "$*"
}

has_cmd() {
    command -v "$1" >/dev/null 2>&1
}

normalize_mode() {
    printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

tty_available() {
    [ "${SHIPGLOWZ_DISABLE_TTY:-0}" != "1" ] && [ -r /dev/tty ] && [ -w /dev/tty ]
}

prompt_install_mode() {
    log "Choisissez le type d'installation:"
    log "  1) local — Termux/poste local, tunnels et commandes utilisateur"
    log "  2) full  — serveur Ubuntu supporté, dépendances système et services (root requis)"
    printf 'Votre choix [1/2]: ' >/dev/tty
    if ! IFS= read -r answer </dev/tty; then
        log "Impossible de lire le choix depuis le terminal."
        return 1
    fi
    case "$(normalize_mode "$answer")" in
        1|l|local) INSTALL_MODE=local ;;
        2|f|full|complet|complete) INSTALL_MODE=full ;;
        *)
            log "Choix invalide: utilisez 1/local ou 2/full."
            return 1
            ;;
    esac
}

resolve_install_mode() {
    if [ -n "$REQUESTED_MODE" ]; then
        INSTALL_MODE="$(normalize_mode "$REQUESTED_MODE")"
        case "$INSTALL_MODE" in
            local|full) ;;
            *)
                log "Mode d'installation invalide: $REQUESTED_MODE. Utilisez local ou full."
                return 1
                ;;
        esac
    elif [ "$IS_TERMUX" = true ]; then
        INSTALL_MODE=local
    elif [ "$CURRENT_UID" -eq 0 ]; then
        INSTALL_MODE=full
    elif tty_available; then
        prompt_install_mode || return 1
    else
        log "Le type d'installation est ambigu et aucun terminal interactif n'est disponible."
        log "Mode local:"
        log "  curl -fsSL $PUBLIC_INSTALL_URL | SHIPGLOWZ_INSTALL_MODE=local sh"
        log "Mode serveur complet (sur un système avec sudo):"
        log "  curl -fsSL $PUBLIC_INSTALL_URL | sudo env SHIPGLOWZ_INSTALL_MODE=full sh"
        return 1
    fi

    if [ "$IS_TERMUX" = true ] && [ "$INSTALL_MODE" = full ]; then
        log "Le mode full n'est pas pris en charge dans Termux."
        log "Utilisez le mode local, sans sudo:"
        log "  curl -fsSL $PUBLIC_INSTALL_URL | SHIPGLOWZ_INSTALL_MODE=local sh"
        return 1
    fi

    if [ "$INSTALL_MODE" = full ] && [ "$CURRENT_UID" -ne 0 ]; then
        log "Le mode full installe des dépendances système et doit être lancé en root."
        log "Commande recommandée sur un serveur avec sudo:"
        log "  curl -fsSL $PUBLIC_INSTALL_URL | sudo env SHIPGLOWZ_INSTALL_MODE=full sh"
        return 1
    fi
}

INSTALL_MODE=""
resolve_install_mode || exit 1

if [ "$CURRENT_UID" -eq 0 ] && [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER:-}" != root ]; then
    INSTALL_USER="$SUDO_USER"
    INSTALL_HOME="$(getent passwd "$INSTALL_USER" 2>/dev/null | cut -d: -f6 || true)"
    INSTALL_HOME="${INSTALL_HOME:-/home/$INSTALL_USER}"
else
    INSTALL_USER="$CURRENT_USER"
    INSTALL_HOME="${HOME:-}"
    if [ -z "$INSTALL_HOME" ]; then
        if [ "$CURRENT_UID" -eq 0 ]; then
            INSTALL_HOME=/root
        else
            INSTALL_HOME="/home/$INSTALL_USER"
        fi
    fi
fi

SHIPGLOWZ_DIR="${SHIPGLOWZ_DIR:-${SHIPFLOW_DIR:-$INSTALL_HOME/shipglowz}}"
BOOTSTRAP_LOG="${SHIPGLOWZ_BOOTSTRAP_LOG:-${SHIPFLOW_BOOTSTRAP_LOG:-$INSTALL_HOME/shipglowz-bootstrap.log}}"

prepare_log() {
    mkdir -p "$(dirname "$BOOTSTRAP_LOG")" 2>/dev/null || true
    : > "$BOOTSTRAP_LOG" 2>/dev/null || true
    if [ "$CURRENT_UID" -eq 0 ] && [ "$INSTALL_USER" != root ]; then
        chown "$INSTALL_USER":"$INSTALL_USER" "$BOOTSTRAP_LOG" 2>/dev/null || true
    fi
}

run_or_explain() {
    label=$1
    shift
    if "$@" </dev/null >>"$BOOTSTRAP_LOG" 2>&1; then
        return 0
    fi
    log "Échec: $label."
    log "Détails: $BOOTSTRAP_LOG"
    log "Dernières lignes:"
    tail -n 8 "$BOOTSTRAP_LOG" 2>/dev/null || true
    return 1
}

as_install_user() {
    if [ "$CURRENT_UID" -eq 0 ] && [ "$INSTALL_USER" != root ]; then
        if has_cmd sudo; then
            sudo -H -u "$INSTALL_USER" "$@"
        elif has_cmd runuser; then
            runuser -u "$INSTALL_USER" -- "$@"
        else
            log "Impossible d'exécuter la commande pour $INSTALL_USER: sudo/runuser absent."
            return 1
        fi
    else
        "$@"
    fi
}

install_bootstrap_deps() {
    if has_cmd git && has_cmd curl && has_cmd bash; then
        return 0
    fi

    log "Installation des dépendances de bootstrap..."
    if [ "$IS_TERMUX" = true ] && has_cmd pkg; then
        run_or_explain "installation des dépendances Termux" pkg install -y git curl bash ca-certificates openssh autossh
    elif [ "$INSTALL_MODE" = full ] && has_cmd apt-get; then
        run_or_explain "mise à jour apt" apt-get update -qq
        run_or_explain "installation de git/curl/bash" apt-get install -y -qq git curl bash ca-certificates
    else
        log "Impossible d'installer automatiquement git/curl/bash dans ce mode."
        if [ "$IS_TERMUX" = true ]; then
            log "Installez-les avec: pkg install git curl bash ca-certificates openssh autossh"
        else
            log "Installez git, curl et bash pour votre système, puis relancez la commande."
        fi
        return 1
    fi
}

stash_shipglowz_changes() {
    if [ -z "$(git -C "$SHIPGLOWZ_DIR" status --porcelain 2>/dev/null)" ]; then
        return 0
    fi
    log "Modifications locales détectées dans $SHIPGLOWZ_DIR; sauvegarde temporaire..."
    run_or_explain "sauvegarde des modifications locales ShipGlowz" as_install_user env \
        GIT_AUTHOR_NAME="ShipGlowz Bootstrap" \
        GIT_AUTHOR_EMAIL="shipglowz-bootstrap@example.invalid" \
        GIT_COMMITTER_NAME="ShipGlowz Bootstrap" \
        GIT_COMMITTER_EMAIL="shipglowz-bootstrap@example.invalid" \
        git -C "$SHIPGLOWZ_DIR" stash push -u -m "shipglowz-bootstrap backup $(date -u +%Y%m%dT%H%M%SZ)"
}

repository_download_error() {
    log "Le dépôt public ShipGlowz est inaccessible ou le téléchargement a échoué."
    log "Vérifiez la connexion réseau, l'URL du dépôt et la branche demandée, puis relancez la commande."
    log "Aucun token ne doit être ajouté à l'URL ou collé dans le journal."
}

prepare_log
log "Préparation de l'installation ShipGlowz..."
log "Mode d'installation: $INSTALL_MODE"
install_bootstrap_deps

if [ -d "$SHIPGLOWZ_DIR/.git" ]; then
    log "Mise à jour du dépôt ShipGlowz..."
    stash_shipglowz_changes
    run_or_explain "accès au dépôt public et récupération de $BRANCH" as_install_user git -C "$SHIPGLOWZ_DIR" fetch origin "$BRANCH" || {
        repository_download_error
        exit 1
    }
    run_or_explain "sélection de la branche $BRANCH" as_install_user git -C "$SHIPGLOWZ_DIR" checkout "$BRANCH"
    run_or_explain "mise à jour du dépôt ShipGlowz" as_install_user git -C "$SHIPGLOWZ_DIR" pull --ff-only origin "$BRANCH"
elif [ -e "$SHIPGLOWZ_DIR" ]; then
    log "$SHIPGLOWZ_DIR existe déjà mais ce n'est pas un dépôt git."
    log "Déplacez-le ou définissez SHIPGLOWZ_DIR vers un autre chemin, puis relancez."
    exit 1
else
    log "Téléchargement de ShipGlowz..."
    mkdir -p "$(dirname "$SHIPGLOWZ_DIR")"
    run_or_explain "accès et téléchargement du dépôt public ShipGlowz" as_install_user git clone --quiet --branch "$BRANCH" "$REPO_URL" "$SHIPGLOWZ_DIR" || {
        repository_download_error
        exit 1
    }
fi

if [ "$INSTALL_MODE" = local ]; then
    log "Lancement de la configuration locale pour $INSTALL_USER..."
    if [ "$CURRENT_UID" -eq 0 ] && [ "$INSTALL_USER" != root ]; then
        if has_cmd sudo; then
            exec sudo -H -u "$INSTALL_USER" bash "$SHIPGLOWZ_DIR/local/install.sh" "$@"
        elif has_cmd runuser; then
            exec runuser -u "$INSTALL_USER" -- bash "$SHIPGLOWZ_DIR/local/install.sh" "$@"
        fi
        log "Impossible de lancer l'installateur local pour $INSTALL_USER."
        exit 1
    fi
    exec bash "$SHIPGLOWZ_DIR/local/install.sh" "$@"
fi

log "Lancement de l'installation serveur complète..."
exec bash "$SHIPGLOWZ_DIR/cli/install.sh" "$@"
