export const SOLIDS={
  cube:{vertices:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]]},
  diamond:{vertices:[[0,.65,0],[0,-.65,0],[-.55,0,0],[.55,0,0],[0,0,-.55],[0,0,.55]],faces:[[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]]},
  dart:{vertices:[[0,0,.9],[-.6,-.25,-.45],[.6,-.25,-.45],[0,.65,-.3]],faces:[[0,1,2],[0,3,1],[0,2,3],[1,3,2]]},
  prism:{vertices:[[-.65,-.28,-.45],[.65,-.28,-.45],[0,-.28,.75],[-.65,.28,-.45],[.65,.28,-.45],[0,.28,.75]],faces:[[0,2,1],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]]},
  ship:{vertices:[[0,0,.95],[-.7,0,-.55],[0,.08,-.2],[.7,0,-.55],[0,.38,-.12]],faces:[[0,4,1],[0,3,4],[1,4,2],[2,4,3],[0,1,2],[0,2,3]]},
};
const crossOutline=[[-.22,-.85],[.22,-.85],[.22,-.22],[.85,-.22],[.85,.22],[.22,.22],[.22,.85],[-.22,.85],[-.22,.22],[-.85,.22],[-.85,-.22],[-.22,-.22]];
SOLIDS.cross={vertices:[...crossOutline.map(([x,z])=>[x,.18,z]),...crossOutline.map(([x,z])=>[x,-.18,z]),[0,.18,0],[0,-.18,0]],faces:[],outlineEdges:[]};
for(let i=0;i<12;i++){const n=(i+1)%12;SOLIDS.cross.faces.push([24,i,n],[25,n+12,i+12],[i,i+12,n+12,n]);SOLIDS.cross.outlineEdges.push([i,n],[i+12,n+12],[i,i+12]);}
for(const solid of Object.values(SOLIDS)){
  const edges=new Map();for(const face of solid.faces)for(let i=0;i<face.length;i++){const a=face[i],b=face[(i+1)%face.length];edges.set([a,b].sort((x,y)=>x-y).join(','),[a,b]);}
  solid.edges=solid.outlineEdges||[...edges.values()];
}
