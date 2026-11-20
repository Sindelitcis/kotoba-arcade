"""Trava da placa de vídeo, dividida entre as sessões e os programas do Kotoba Arcade.

Quem usa a placa (estúdio de imagens, motores de voz, testes de modelo) passa por aqui. A trava é do
sistema operacional, presa num arquivo mantido aberto: se o processo morre, o sistema solta sozinho.
O texto dentro de D:\\KotobaArcade\\arte\\gpu.lock só diz quem está usando, para gente ler. Enquanto a
trava está presa, o arquivo não pode ser apagado (no Windows).

Uso:

    python -I scripts/placa.py [--nome N] [--vram GB] [--nao-esperar] -- comando [args...]
    python -I scripts/placa.py status

O comando roda com a placa presa e nunca fica usando a placa sem trava: no Windows, se o placa.py for
morto, o comando e os filhos dele morrem junto; no Linux, o comando herda a trava. Antes de prender, espera o Ollama não ter modelo carregado, os motores de voz de outra
pessoa saírem do ar e, com --vram, sobrar essa memória livre na placa (o Rafael pode estar jogando).

Em Python: `with Placa("minha-sessao", vram_gb=10): ...`.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
import urllib.request

ARTE = pathlib.Path(os.environ.get("KOTOBA_ARTE", "D:/KotobaArcade/arte"))
TRAVA = ARTE / "gpu.lock"
# Marca do texto escrito por esta versão. Arquivo sem ela é do lock antigo (só o arquivo, sem trava).
MARCA = "placa.py"
# Byte travado, longe do texto, para quem espera ainda conseguir ler o nome do dono.
POSICAO = 1 << 20
# Lock antigo com pid vivo só vale por este tempo: depois disso o pid pode ser de outro programa.
VALIDADE_ANTIGO = 6 * 3600
OCUPADA = 75


class Ocupada(RuntimeError):
    """A placa está com outro dono e o pedido foi para não esperar."""


# ---------------------------------------------------------------- trava do sistema


def _prender(fd: int) -> bool:
    if os.name == "nt":
        import msvcrt

        os.lseek(fd, POSICAO, os.SEEK_SET)
        try:
            msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
            return True
        except OSError:
            return False
    import fcntl

    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except OSError:
        return False


def _soltar(fd: int) -> None:
    if os.name == "nt":
        import msvcrt

        os.lseek(fd, POSICAO, os.SEEK_SET)
        try:
            msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
        except OSError:
            pass
    else:
        import fcntl

        fcntl.flock(fd, fcntl.LOCK_UN)


def pid_vivo(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":
        import ctypes

        k = ctypes.windll.kernel32
        h = k.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        codigo = ctypes.c_ulong()
        ok = k.GetExitCodeProcess(h, ctypes.byref(codigo))
        k.CloseHandle(h)
        return bool(ok) and codigo.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def dono_antigo_vivo(texto: str, idade: float) -> bool:
    """O arquivo é do lock antigo (sem trava do sistema) e o processo dele ainda roda?"""
    if MARCA in texto or idade > VALIDADE_ANTIGO:
        return False
    m = re.search(r"pid (\d+)", texto)
    return bool(m) and int(m.group(1)) != os.getpid() and pid_vivo(int(m.group(1)))


def ler_dono() -> str:
    try:
        return TRAVA.read_text(encoding="utf-8", errors="replace").strip("\0 \n")
    except OSError:
        return ""


# ---------------------------------------------------------------- outros usos da placa


def _sondas_ligadas() -> bool:
    return os.environ.get("KOTOBA_PLACA_SEM_SONDAS") != "1"


def ollama_carregado() -> bool:
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/ps", timeout=2) as r:
            return bool(json.load(r).get("models"))
    except Exception:
        return False


def voz_no_ar() -> bool:
    for porta in (10101, 50021):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{porta}/version", timeout=2)
            return True
        except Exception:
            pass
    return False


def vram_livre_gb() -> float | None:
    """Memória livre na placa segundo o nvidia-smi, ou None se não der para saber."""
    exe = shutil.which("nvidia-smi")
    if not exe:
        return None
    try:
        r = subprocess.run(
            [exe, "--query-gpu=memory.total,memory.used", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10,
        )
        total, usado = (float(x) for x in r.stdout.splitlines()[0].split(","))
        return (total - usado) / 1024
    except Exception:
        return None


def motivo_para_esperar(vram_gb: float) -> str | None:
    if not _sondas_ligadas():
        return None
    if ollama_carregado():
        return "o Ollama tem um modelo carregado"
    if voz_no_ar():
        return "um motor de voz está no ar"
    if vram_gb > 0:
        livre = vram_livre_gb()
        if livre is not None and livre < vram_gb:
            return f"só {livre:.1f} GB livres na placa (precisa de {vram_gb:.0f})"
    return None


# ---------------------------------------------------------------- comando junto com a trava (Windows)


class _Job:
    def __init__(self, k, handle):
        self.k, self.handle = k, handle

    def prender(self, p: subprocess.Popen) -> None:
        if not self.k.AssignProcessToJobObject(self.handle, int(p._handle)):
            p.kill()
            raise OSError("não deu para prender o comando ao placa.py")


def _job_que_mata_ao_fechar() -> _Job:
    """Job Object que mata todos os processos dele quando o último handle fecha, isto é, quando o
    placa.py termina ou é morto. A trava do Windows é do processo que a pegou e não passa para filhos."""
    import ctypes
    from ctypes import wintypes

    class Basico(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD), ("SchedulingClass", wintypes.DWORD),
        ]

    class Io(ctypes.Structure):
        _fields_ = [(n, ctypes.c_uint64) for n in ("R", "W", "O", "RT", "WT", "OT")]

    class Estendido(ctypes.Structure):
        _fields_ = [
            ("Basic", Basico), ("Io", Io), ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t), ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    k = ctypes.WinDLL("kernel32", use_last_error=True)
    k.CreateJobObjectW.restype = wintypes.HANDLE
    k.CreateJobObjectW.argtypes = (ctypes.c_void_p, wintypes.LPCWSTR)
    k.SetInformationJobObject.argtypes = (wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD)
    k.AssignProcessToJobObject.argtypes = (wintypes.HANDLE, wintypes.HANDLE)
    job = k.CreateJobObjectW(None, None)
    info = Estendido()
    info.Basic.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not job or not k.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info)):
        raise OSError(ctypes.get_last_error(), "CreateJobObject")
    return _Job(k, job)


# ---------------------------------------------------------------- a trava


class Placa:
    """`with Placa("sessao"):` prende a placa até sair do bloco, mesmo com erro."""

    def __init__(self, nome: str | None = None, vram_gb: float = 0, esperar: bool = True,
                 intervalo: float = 30, avisar=None):
        self.nome = nome or os.environ.get("KOTOBA_SESSAO", "sem-nome")
        self.vram_gb = vram_gb
        self.esperar = esperar
        self.intervalo = intervalo
        self.avisar = avisar or (lambda m: print(m, file=sys.stderr, flush=True))
        self.fd: int | None = None

    def _tentar(self) -> str | None:
        """Tenta prender uma vez. Devolve None se prendeu, ou o motivo de não ter prendido."""
        motivo = motivo_para_esperar(self.vram_gb)
        if motivo:
            return motivo
        TRAVA.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(TRAVA, os.O_RDWR | os.O_CREAT | getattr(os, "O_BINARY", 0), 0o644)
        if not _prender(fd):
            os.close(fd)
            return f"em uso: {ler_dono() or 'dono sem nome'}"
        if os.name != "nt":
            # Quem soltou pode ter apagado o arquivo depois que este foi aberto: a trava seria de um arquivo órfão.
            try:
                if os.stat(TRAVA).st_ino != os.fstat(fd).st_ino:
                    os.close(fd)
                    return "o arquivo da trava foi trocado"
            except FileNotFoundError:
                os.close(fd)
                return "o arquivo da trava foi apagado"
        os.lseek(fd, 0, os.SEEK_SET)
        texto = os.read(fd, 4096).decode("utf-8", "replace").strip("\0 \n")
        idade = time.time() - os.fstat(fd).st_mtime
        if texto and dono_antigo_vivo(texto, idade):
            _soltar(fd)
            os.close(fd)
            return f"em uso (lock antigo): {texto}"
        agora = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        os.ftruncate(fd, 0)
        os.lseek(fd, 0, os.SEEK_SET)
        os.write(fd, f"{self.nome} {agora} pid {os.getpid()} ({MARCA})\n".encode("utf-8"))
        self.fd = fd
        return None

    def __enter__(self) -> "Placa":
        ultimo = None
        while True:
            motivo = self._tentar()
            if motivo is None:
                return self
            if not self.esperar:
                raise Ocupada(motivo)
            if motivo != ultimo:
                self.avisar(f"placa ocupada ({motivo}); esperando...")
                ultimo = motivo
            time.sleep(self.intervalo)

    def __exit__(self, *exc) -> bool:
        if self.fd is not None:
            try:
                os.ftruncate(self.fd, 0)
            except OSError:
                pass
            _soltar(self.fd)
            os.close(self.fd)
            self.fd = None
            try:
                TRAVA.unlink()  # se outro processo já abriu para esperar, fica: o texto vazio não prende ninguém
            except OSError:
                pass
        return False

    def rodar(self, cmd: list[str]) -> int:
        """Roda `cmd` com a placa presa. Nunca fica comando usando a placa sem trava:
        no Windows, se este processo morrer, o comando e os filhos dele morrem junto (Job Object);
        no Linux, o comando herda a trava e ela só solta quando ele termina."""
        assert self.fd is not None
        if os.name == "nt":
            job = _job_que_mata_ao_fechar()
            p = subprocess.Popen(cmd)
            job.prender(p)
        else:
            os.set_inheritable(self.fd, True)
            p = subprocess.Popen(cmd, pass_fds=[self.fd])
        try:
            return p.wait()
        except KeyboardInterrupt:
            p.terminate()
            return p.wait()


def main(argv: list[str]) -> int:
    if argv[:1] == ["status"]:
        try:
            with Placa("status", esperar=False):
                print("livre")
        except Ocupada as e:
            print(f"ocupada: {e}")
        return 0
    if "--" not in argv:
        print(__doc__, file=sys.stderr)
        return 2
    i = argv.index("--")
    ap = argparse.ArgumentParser(prog="placa.py")
    ap.add_argument("--nome")
    ap.add_argument("--vram", type=float, default=0, help="GB livres na placa para começar")
    ap.add_argument("--nao-esperar", action="store_true")
    ap.add_argument("--intervalo", type=float, default=30)
    a = ap.parse_args(argv[:i])
    cmd = argv[i + 1:]
    if not cmd:
        print("faltou o comando depois de --", file=sys.stderr)
        return 2
    try:
        with Placa(a.nome, a.vram, not a.nao_esperar, a.intervalo) as placa:
            return placa.rodar(cmd)
    except Ocupada as e:
        print(f"placa ocupada: {e}", file=sys.stderr)
        return OCUPADA


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
