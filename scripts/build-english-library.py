"""Gera src/lib/english/library.generated.ts (unidades 5 a 10 do Babel) a partir do corpus Tatoeba (pares en-pt, CC BY 2.0 FR).

Uso:  python scripts/build-english-library.py <por.txt do ManyThings/Tatoeba> [saida.ts]
O arquivo gerado é versionado; o corpus bruto não. Palavras ensinadas e traduções são escritas à mão aqui;
as frases vêm do Tatoeba, filtradas (só vocabulário conhecido, sem temas impróprios, sem marcas de português de Portugal).
"""
import json, random, re, sys
from collections import Counter

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "src/lib/english/library.generated.ts"

# --------------------------------------------------------------------------- unidades (palavras: en, pt)
UNITS = [
    (5, "Minha rotina", "⏰", "A2", "O dia a dia: de manhã, na escola e os hábitos.", [
        ("De manhã", [("wake up", "acordar"), ("get up", "levantar"), ("shower", "banho / chuveiro"), ("breakfast", "café da manhã"), ("brush", "escovar"), ("teeth", "dentes"), ("early", "cedo"), ("late", "tarde / atrasado"), ("bed", "cama"), ("tired", "cansado"), ("morning", "manhã"), ("hurry", "pressa")]),
        ("Na escola", [("school", "escola"), ("class", "aula / turma"), ("teacher", "professor(a)"), ("homework", "dever de casa"), ("study", "estudar"), ("lesson", "lição"), ("test", "prova"), ("lunch", "almoço"), ("friend", "amigo(a)"), ("book", "livro"), ("bus", "ônibus"), ("walk", "andar / caminhar")]),
        ("Meus hábitos", [("always", "sempre"), ("usually", "geralmente"), ("often", "frequentemente"), ("sometimes", "às vezes"), ("never", "nunca"), ("every", "todo / cada"), ("day", "dia"), ("week", "semana"), ("weekend", "fim de semana"), ("evening", "noite (começo)"), ("dinner", "jantar"), ("sleep", "dormir")]),
    ]),
    (6, "Onde fica?", "🗺️", "A2", "Lugares da cidade, direções e transporte.", [
        ("Direções", [("street", "rua"), ("corner", "esquina"), ("left", "esquerda"), ("right", "direita / certo"), ("straight", "reto"), ("near", "perto"), ("far", "longe"), ("map", "mapa"), ("turn", "virar"), ("cross", "atravessar"), ("next", "próximo"), ("between", "entre")]),
        ("Na cidade", [("city", "cidade"), ("bank", "banco"), ("station", "estação"), ("hospital", "hospital"), ("store", "loja"), ("market", "mercado"), ("park", "parque"), ("church", "igreja"), ("restaurant", "restaurante"), ("bridge", "ponte"), ("building", "prédio"), ("library", "biblioteca")]),
        ("Transporte", [("train", "trem"), ("car", "carro"), ("bike", "bicicleta"), ("taxi", "táxi"), ("subway", "metrô"), ("ticket", "passagem / ingresso"), ("airport", "aeroporto"), ("drive", "dirigir"), ("ride", "andar de (bike, cavalo)"), ("plane", "avião"), ("ship", "navio"), ("traffic", "trânsito")]),
    ]),
    (7, "O que você fez?", "⏪", "A2", "Passado simples: ontem, verbos regulares e irregulares.", [
        ("Ontem", [("yesterday", "ontem"), ("ago", "atrás (tempo)"), ("last", "último / passado"), ("was", "era / estava"), ("were", "eram / estavam"), ("played", "jogou / tocou"), ("watched", "assistiu"), ("visited", "visitou"), ("called", "ligou / chamou"), ("worked", "trabalhou"), ("cooked", "cozinhou"), ("helped", "ajudou")]),
        ("Verbos irregulares", [("went", "foi"), ("saw", "viu"), ("ate", "comeu"), ("had", "teve / tinha"), ("came", "veio"), ("took", "pegou / levou"), ("made", "fez (criou)"), ("bought", "comprou"), ("gave", "deu"), ("found", "encontrou"), ("lost", "perdeu"), ("said", "disse")]),
        ("Fim de semana", [("party", "festa"), ("movie", "filme"), ("trip", "viagem"), ("beach", "praia"), ("cousin", "primo(a)"), ("grandmother", "avó"), ("birthday", "aniversário"), ("gift", "presente"), ("music", "música"), ("dance", "dançar"), ("sang", "cantou"), ("laughed", "riu")]),
    ]),
    (8, "Planos e sonhos", "🚀", "A2", "O futuro: amanhã, planos, profissões e decisões.", [
        ("Amanhã", [("tomorrow", "amanhã"), ("tonight", "hoje à noite"), ("soon", "em breve"), ("plan", "plano / planejar"), ("maybe", "talvez"), ("will", "vai (futuro)"), ("going", "indo / vai"), ("hope", "esperar / esperança"), ("meet", "encontrar"), ("wait", "esperar"), ("later", "mais tarde"), ("ready", "pronto")]),
        ("Sonhos", [("dream", "sonho / sonhar"), ("future", "futuro"), ("college", "faculdade"), ("job", "emprego"), ("doctor", "médico(a)"), ("engineer", "engenheiro(a)"), ("famous", "famoso"), ("rich", "rico"), ("learn", "aprender"), ("travel", "viajar"), ("build", "construir"), ("become", "tornar-se")]),
        ("Decisões", [("decide", "decidir"), ("choose", "escolher"), ("promise", "prometer"), ("try", "tentar"), ("invite", "convidar"), ("prepare", "preparar"), ("change", "mudar / troco"), ("start", "começar"), ("finish", "terminar"), ("remember", "lembrar"), ("forget", "esquecer"), ("believe", "acreditar")]),
    ]),
    (9, "Minha opinião", "💬", "B1", "Dar opinião, descrever coisas e conversar com argumentos.", [
        ("Dar opinião", [("think", "pensar / achar"), ("opinion", "opinião"), ("agree", "concordar"), ("disagree", "discordar"), ("because", "porque"), ("really", "realmente"), ("probably", "provavelmente"), ("honestly", "honestamente"), ("true", "verdade / verdadeiro"), ("wrong", "errado"), ("sure", "certo / seguro"), ("maybe", "talvez")]),
        ("Descrever", [("interesting", "interessante"), ("boring", "chato / entediante"), ("funny", "engraçado"), ("beautiful", "bonito / lindo"), ("dangerous", "perigoso"), ("easy", "fácil"), ("difficult", "difícil"), ("important", "importante"), ("strange", "estranho"), ("special", "especial"), ("wonderful", "maravilhoso"), ("terrible", "terrível")]),
        ("Conversar", [("example", "exemplo"), ("reason", "motivo / razão"), ("but", "mas"), ("also", "também"), ("instead", "em vez disso"), ("although", "embora"), ("together", "juntos"), ("enough", "suficiente"), ("problem", "problema"), ("idea", "ideia"), ("question", "pergunta"), ("answer", "resposta")]),
    ]),
    (10, "Viagem e emergências", "✈️", "B1", "Aeroporto, compras e o que dizer quando precisa de ajuda.", [
        ("Viagem", [("passport", "passaporte"), ("luggage", "bagagem"), ("suitcase", "mala"), ("flight", "voo"), ("hotel", "hotel"), ("reservation", "reserva"), ("gate", "portão"), ("tourist", "turista"), ("arrive", "chegar"), ("leave", "sair / partir"), ("delay", "atraso"), ("journey", "jornada")]),
        ("Compras", [("money", "dinheiro"), ("price", "preço"), ("cheap", "barato"), ("expensive", "caro"), ("receipt", "recibo"), ("size", "tamanho"), ("discount", "desconto"), ("pay", "pagar"), ("cash", "dinheiro vivo"), ("card", "cartão"), ("bag", "sacola / bolsa"), ("shop", "loja / comprar")]),
        ("Emergências", [("help", "ajuda / ajudar"), ("emergency", "emergência"), ("police", "polícia"), ("medicine", "remédio"), ("pain", "dor"), ("sick", "doente"), ("ambulance", "ambulância"), ("danger", "perigo"), ("careful", "cuidadoso"), ("hurt", "machucado / doer"), ("safe", "seguro"), ("accident", "acidente")]),
    ]),
]

# --------------------------------------------------------------------------- filtros
BLOCK_EN = set("""kill kills killed die dies died dead death murder murdered gun guns shoot shot weapon bomb war sex sexual drunk beer wine alcohol drug drugs cigarette cigarettes smoke smoking naked hell damn shit fuck fucking ass bitch stupid idiot hate hates hated suicide rape gay lesbian boyfriend girlfriend kiss kissed kissing sexy hot prison jail police? attack attacked terrorist terror blood bleeding cancer virus pregnant abortion divorce dating date president politics political government trump allah muslim islam jew jewish hitler nazi god's demon devil satan witch rich? vote election""".replace("?", "").split())
BLOCK_PT = re.compile(r"\b(tu|ti|teu|tua|autocarro|comboio|telemóvel|ecrã|pequeno-almoço|rapariga|miúdo|miúdos|fato|casa de banho|estás|tens|és|queres|vais|podes|fazes|gostas|foste|vês|sabes|disseste|ficaste|estou a|estamos a|estão a|está a|estás a|a fazer|a trabalhar|a estudar|a comer|a ver|a dormir|a ler|a falar|a jogar|a cozinhar|a conduzir|utilizador|facto|desporto|equipa|ficheiro|rato)\b|\w-(me|te|se|o|a|os|as|lo|la|los|las|lhe|lhes|nos|vos|no|na|mos|tos)\b", re.I)
BR_HINT = re.compile(r"\b(você|vocês|a gente|ônibus|trem|celular|café da manhã|menino|menina|garoto|garota|legal|bacana)\b", re.I)
TOK = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")

def tokens(s):
    return TOK.findall(s)

def forms(w):
    """Formas aceitas de uma palavra-chave (plural, passado, -ing)."""
    out = {w}
    for p in w.split():
        pass
    if " " in w:
        return {w}
    out |= {w + "s", w + "es", w + "ed", w + "d", w + "ing", w[:-1] + "ies", w[:-1] + "ied", w[:-1] + "ing", w + w[-1] + "ing", w + w[-1] + "ed"}
    return out

# --------------------------------------------------------------------------- corpus
pairs = {}
authors = {}
for line in open(SRC, encoding="utf-8"):
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 3:
        continue
    en, pt, att = parts[0].strip(), parts[1].strip(), parts[2]
    pairs.setdefault(en, []).append((pt, att))

freq = Counter()
for en in pairs:
    for t in tokens(en):
        freq[t.lower()] += 1

# vocabulário conhecido: as 1300 palavras mais comuns do corpus + palavras ensinadas (cumulativo) + nomes
COMMON = {w for w, _ in freq.most_common(1300)}
NAMES = {"tom", "mary", "john", "ann", "brazil", "english", "portuguese", "spanish", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "i'm", "it's", "don't", "doesn't", "didn't", "can't", "isn't", "i'll", "you're", "we're", "they're", "that's", "he's", "she's", "i've", "let's", "what's", "there's", "won't", "wasn't", "weren't", "couldn't", "wouldn't"}
known = (COMMON - BLOCK_EN) | NAMES

def ok_pair(en, pt, att):
    ts = tokens(en)
    if not (4 <= len(ts) <= 9) or len(en) > 70:
        return False
    if any(t.lower() in BLOCK_EN for t in ts):
        return False
    if BLOCK_PT.search(pt) or re.search(r"[0-9@#/\\]", en):
        return False
    if "?" in en and "?" not in pt:
        return False
    return True

rng = random.Random(2610)
out_units, author_set, used_ids = [], set(), set()
all_words_used = set()
cumulative = set()

def author_names(att):
    return re.findall(r"\(([^)]+)\)", att)

def words_for(lesson_words):
    return {w for w, _ in lesson_words}

stats = []
for n, title, emoji, level, about, lessons in UNITS:
    unit_words = {w for _, ws in lessons for w, _ in ws}
    cumulative |= {f for w in unit_words for f in forms(w)}
    unit_lessons = []
    for li, (ltitle, wl) in enumerate(lessons, 1):
        wl = [(w, p) for w, p in wl if w not in all_words_used] or wl
        all_words_used |= {w for w, _ in wl}
        keyset = {}
        for w, _ in wl:
            for f in forms(w):
                keyset[f] = w
        cands = []
        for en, lst in pairs.items():
            if en in used_ids:
                continue
            ts = [t.lower() for t in tokens(en)]
            hit = [t for t in ts if t in keyset]
            if not hit:
                continue
            if any(t not in known and t not in cumulative for t in ts):
                continue
            best = None
            for pt, att in lst:
                if ok_pair(en, pt, att):
                    sc = (1 if BR_HINT.search(pt) else 0, -len(pt))
                    if best is None or sc > best[0]:
                        best = (sc, pt, att)
            if best:
                cands.append((en, best[1], best[2], hit[0], len(set(hit))))
        # prefere frases curtas e com mais palavras da lição; espalha entre as palavras
        rng.shuffle(cands)
        cands.sort(key=lambda c: (-c[4], len(c[0])))
        chosen, per_word = [], Counter()
        for en, pt, att, kw, _ in cands:
            w = keyset[kw]
            if per_word[w] >= 1:
                continue
            chosen.append((en, pt, att, kw, w))
            per_word[w] += 1
            if len(chosen) >= 8:
                break
        stats.append((n, li, len(chosen)))
        for en, _, att, _, _ in chosen:
            used_ids.add(en)
            author_set |= set(author_names(att))
        if len(chosen) < 6:
            print(f"AVISO: unidade {n} lição {li} só achou {len(chosen)} frases", file=sys.stderr)
        sent = [{"en": en, "pt": pt, "kw": kw, "w": w} for en, pt, _, kw, w in chosen]
        unit_lessons.append((ltitle, wl, sent))
    out_units.append((n, title, emoji, level, about, unit_lessons))

# --------------------------------------------------------------------------- exercícios
def clean_tok(s):
    return tokens(s)

def make_bank(en, rng2, pool):
    ws = en.rstrip(".!?").split()
    ws = [re.sub(r"[.,!?;:]", "", w) for w in ws]
    extra = [w for w in rng2.sample(pool, 12) if w.lower() not in [x.lower() for x in ws]][:3]
    return ws, ws + extra

def build_lesson(unit_n, li, ltitle, wl, sent, seed):
    r = random.Random(seed)
    ex = []
    en_words = [w for w, _ in wl]
    pool = sorted({t for s in sent for t in clean_tok(s["en"])} | set(en_words)) or en_words

    def opts_for(correct, others):
        pick = r.sample([o for o in others if o != correct], 3)
        opts = pick + [correct]
        r.shuffle(opts)
        return opts, opts.index(correct)

    w = wl
    S = sent + sent[: max(0, 6 - len(sent))]
    # 1 escolha da palavra
    en, pt = w[0]
    o, a = opts_for(en, en_words)
    ex.append({"k": "mc", "q": f"Como se diz “{pt}” em inglês?", "opts": o, "a": a, "ex": f"“{en}” significa “{pt}”."})
    # 2 ligar pares
    ex.append({"k": "mt", "pairs": [[x, y] for x, y in w[1:5]], "ex": "Essas palavras aparecem nas frases desta lição: " + "; ".join(f"{x} = {y}" for x, y in w[1:5]) + "."})
    # 3 montar frase
    if len(S) > 0:
        ws, bank = make_bank(S[0]["en"], r, pool)
        ex.append({"k": "tr", "pt": S[0]["pt"], "ans": [S[0]["en"]], "bank": bank, "ex": f"“{S[0]['en']}” = “{S[0]['pt']}”."})
    # 4 ouvir palavra
    en, pt = w[5]
    o, a = opts_for(en, en_words)
    ex.append({"k": "mc", "q": "Toque no que você ouviu", "opts": o, "a": a, "ex": f"Você ouviu “{en}”, que significa “{pt}”.", "say": en})
    # 5 digitar palavra
    en, pt = w[6]
    ex.append({"k": "ty", "prompt": pt, "ans": [en], "ex": f"“{pt}” em inglês é “{en}”.", "hint": f"Começa com “{en[0]}”"})
    # 6 ouvir frase
    if len(S) > 1:
        ex.append({"k": "ls", "say": S[1]["en"], "ans": [S[1]["en"]], "ex": f"Você ouviu: “{S[1]['en']}” ({S[1]['pt']})."})
    # 7 completar lacuna (a tradução dá a pista)
    if len(S) > 2:
        s = S[2]
        toks = s["en"].split()
        idx = next((i for i, t in enumerate(toks) if re.sub(r"[.,!?]", "", t).lower() == s["kw"]), None)
        if idx is not None:
            correct = re.sub(r"[.,!?]", "", toks[idx])
            blanked = " ".join("___" if i == idx else t for i, t in enumerate(toks))
            distract = [t for t in pool if t.lower() != correct.lower() and len(t) > 2]
            o = r.sample(distract, 3) + [correct]
            r.shuffle(o)
            ex.append({"k": "mc", "q": f"{s['pt']}  →  {blanked}", "opts": o, "a": o.index(correct), "ex": f"“{s['en']}” = “{s['pt']}”."})
    # 8 montar frase
    if len(S) > 3:
        ws, bank = make_bank(S[3]["en"], r, pool)
        ex.append({"k": "tr", "pt": S[3]["pt"], "ans": [S[3]["en"]], "bank": bank, "ex": f"“{S[3]['en']}” = “{S[3]['pt']}”."})
    # 9 digitar a tradução
    if len(S) > 4:
        ex.append({"k": "ty", "prompt": S[4]["pt"], "ans": [S[4]["en"]], "ex": f"“{S[4]['pt']}” em inglês: “{S[4]['en']}”.", "hint": "Escreva a frase inteira"})
    # 10 ouvir frase
    if len(S) > 5:
        ex.append({"k": "ls", "say": S[5]["en"], "ans": [S[5]["en"]], "ex": f"Você ouviu: “{S[5]['en']}” ({S[5]['pt']})."})
    # reforço: palavras que sobraram (mais 2 cartas) para a lição fechar com 10
    extra = 7
    while len(ex) < 10 and extra < len(w):
        en, pt = w[extra]
        o, a = opts_for(en, en_words)
        ex.append({"k": "mc", "q": f"Como se diz “{pt}” em inglês?", "opts": o, "a": a, "ex": f"“{en}” significa “{pt}”."})
        extra += 1
    return ex

units_json = []
for n, title, emoji, level, about, ul in out_units:
    lessons = []
    for li, (ltitle, wl, sent) in enumerate(ul, 1):
        lessons.append({"n": li, "title": ltitle, "exercises": build_lesson(n, li, ltitle, wl, sent, n * 100 + li)})
    units_json.append({"n": n, "title": title, "emoji": emoji, "level": level, "about": about, "lessons": lessons})

authors_sorted = sorted(a for a in author_set if a and a != "CM")
authors_sorted = ["CM"] + authors_sorted if "CM" in author_set else authors_sorted

total_ex = sum(len(l["exercises"]) for u in units_json for l in u["lessons"])
header = "// GERADO por scripts/build-english-library.py. Não edite à mão: rode o script de novo.\n// Frases do Tatoeba.org (CC BY 2.0 FR). Palavras e explicações escritas para o Babel. Veja a tela de créditos.\n"
body = (
    "import type { RawExercise } from \"./types\";\n\n"
    "export type LibraryUnit = { n: number; title: string; emoji: string; level: \"A1\" | \"A2\" | \"B1\"; about: string; lessons: { n: number; title: string; exercises: RawExercise[] }[] };\n\n"
    f"export const LIBRARY_UNITS: LibraryUnit[] = {json.dumps(units_json, ensure_ascii=False, indent=1)} as LibraryUnit[];\n\n"
    f"/** Colaboradores do Tatoeba cujas frases estão nas unidades geradas. */\nexport const TATOEBA_AUTHORS: string[] = {json.dumps(authors_sorted, ensure_ascii=False)};\n"
)
open(OUT, "w", encoding="utf-8").write(header + body)
print("unidades:", len(units_json), "exercícios:", total_ex, "autores:", len(authors_sorted), "frases por lição:", stats)
