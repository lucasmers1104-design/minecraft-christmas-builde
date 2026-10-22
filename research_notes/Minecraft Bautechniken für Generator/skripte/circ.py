import math
def filled(x,y,R): return math.hypot(x,y)<=R
def grid(D, mode, W=None):
    W = W or D; H=D
    Rx=W/2; ratio=W/H
    out=set()
    for j in range(H):
        for i in range(W):
            x=-0.5*(W-2*(i+0.5)); y=-0.5*(H-2*(j+0.5))
            f=lambda a,b: math.sqrt((b*ratio)**2+a**2)<=Rx
            if not f(x,y): continue
            if mode=='filled': out.add((i,j)); continue
            n4=[(1,0),(-1,0),(0,1),(0,-1)]; n8=n4+[(1,1),(1,-1),(-1,1),(-1,-1)]
            nb = n8 if mode=='thick' else n4
            if not all(f(x+a,y+b) for a,b in nb): out.add((i,j))
    return out
def show(D,mode):
    g=grid(D,mode)
    return '\n'.join(''.join('#' if (i,j) in g else '.' for i in range(D)) for j in range(D))
pc={5:(12,16,21),7:(16,24,37),9:(24,32,69),11:(28,40,97),15:(40,56,177),21:(56,80,349)}
for D in range(5,22):
    c=[len(grid(D,m)) for m in ('thin','thick','filled')]
    print(D,c, 'pixelcircles:',pc.get(D))

print("\n=== filled row widths top->middle, and thin quadrant runs")
for D in range(5,22):
    g=grid(D,'filled')
    widths=[sum(1 for i in range(D) if (i,j) in g) for j in range(D)]
    half=widths[:(D+1)//2]
    t=grid(D,'thin'); k=grid(D,'thick')
    # per-row count of outline cells in right half (including centre col for odd D as 'half')
    def runs(s):
        r=[]
        for j in range((D+1)//2):
            cols=[i for i in range(D) if (i,j) in s and i >= D//2]
            r.append(len(cols))
        return r
    print(f"D={D:2d} filled widths: {half}  thin-right-half-per-row: {runs(t)}  thick: {runs(k)}")

def midpoint(r):
    pts=set(); x=0; y=r; d=1-r
    while x<=y:
        for a,b in [(x,y),(y,x),(-x,y),(-y,x),(x,-y),(y,-x),(-x,-y),(-y,-x)]: pts.add((a,b))
        if d<0: d+=2*x+3
        else: d+=2*(x-y)+5; y-=1
        x+=1
    return pts
print("\n=== midpoint(r) vs donatj thin (D=2r+1)")
for r in range(2,11):
    D=2*r+1
    t={(i-r,j-r) for (i,j) in grid(D,'thin')}
    m=midpoint(r)
    print(r, D, 'midpoint',len(m),'donat thin',len(t),'same' if m==t else f'diff: only_mid={sorted(m-t)[:6]} only_donat={sorted(t-m)[:6]}')

print("\n=== quarter arc segments (thin), centre coords")
def segs(D, mode='thin'):
    g=grid(D,mode); c=(D-1)/2
    q=[(i-c, c-j) for (i,j) in g if i-c>=-0.01 and c-j>=-0.01]  # x>=0,y>=0 (top-right quadrant incl axis)
    rows={}; cols={}
    for x,y in q:
        if x<=y+1e-9: rows.setdefault(y,[]).append(x)
        else: cols.setdefault(x,[]).append(y)
    seq=[len(rows[y]) for y in sorted(rows,reverse=True)] + [len(cols[x]) for x in sorted(cols)]
    return seq
for D in range(5,22):
    print(D, 'thin', segs(D,'thin'), ' filled widths', [sum(1 for i in range(D) if (i,j) in grid(D,'filled')) for j in range((D+1)//2)])
for D in (7,9,13,15,21):
    print(f"\nD={D} thin"); print(show(D,'thin'))
print("\nD=15 thick"); print(show(15,'thick'))
