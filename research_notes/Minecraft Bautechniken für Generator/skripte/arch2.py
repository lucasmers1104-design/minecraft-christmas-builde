import math
def pattern(W, kind, extra=None):
    # returns dict (i,j)->'open' for blocks; i in 0..W-1 (clear opening), j>=0 rows above springing row 0
    cx=W/2
    if kind=='round':
        cy=0.5 if W%2 else 0.0   # Kreisgenerator-Konvention: ungerade -> Mittelzeile gehört zum Bogen
        r=W/2; op=lambda x,y: (x-cx)**2+(y-cy)**2<=r*r
        H=math.ceil(r)+1
    elif kind=='gothic':
        op=lambda x,y: x**2+y**2<=W*W and (x-W)**2+y**2<=W*W; H=math.ceil(W*0.8661)+1
    elif kind=='seg':
        h=extra; r=(W*W/4+h*h)/(2*h); cy=h-r; op=lambda x,y:(x-cx)**2+(y-cy)**2<=r*r; H=math.ceil(h)+1
    g={}
    for j in range(H+1):
        for i in range(-1,W+1):
            g[(i,j)] = (0<=i<W) and op(i+.5,j+.5)
    return g,H
def smooth(g,W,H,apex_slab=True):
    out={}
    for (i,j),o in g.items():
        if o: out[(i,j)]='..'; continue
        out[(i,j)]='##'
        below=g.get((i,j-1),False) if j>0 else False
        if not below: continue
        # Seite zur Mitte
        left_half = i+0.5 < W/2; right_half = i+0.5 > W/2
        if left_half and g.get((i+1,j),False): out[(i,j)]='tW'
        elif right_half and g.get((i-1,j),False): out[(i,j)]='tE'
    if apex_slab:
        for (i,j),o in g.items():
            # 1 breite Kerbe im Scheitel: Luft mit Block links, rechts und oben
            if o and not g.get((i-1,j)) and not g.get((i+1,j)) and not g.get((i,j+1),False) and 0<=i<W:
                out[(i,j)]='Ts'
    return out
def show(title,W,kind,extra=None):
    g,H=pattern(W,kind,extra); s=smooth(g,W,H)
    print(f"--- {title} (lichte Weite {W})")
    for j in range(H,-1,-1):
        print(f"  y={j}: "+' '.join(s[(i,j)] for i in range(-1,W+1))+"   |  nur Blöcke: "+''.join('.' if g[(i,j)] else '#' for i in range(-1,W+1)))
for W in (3,4,5,6,7,9,11): show('Rundbogen',W,'round')
for W in (3,5,7,9): show('Spitzbogen r=W',W,'gothic')
for W,h in ((5,1),(7,1.5),(9,2)): show(f'Segmentbogen Stich {h}',W,'seg',h)
