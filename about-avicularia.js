/* Avicularia v151: confirmed taxon names and credited Wikimedia photographs. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const species=[
 ['Avicularia avicularia','20181007 Artis Zoo - Avicularia avicularia.jpg'],
 ['Avicularia caei','Avicularia caei (10.3897-zookeys.659.10717) Figures 210–217.jpg'],
 ['Avicularia glauca','Avicularia glauca (10.3897-zookeys.659.10717) Figures 52–53.jpg'],
 ['Avicularia hirschii','Avicularia hirschii 116038085.jpg'],
 ['Avicularia juruensis','Avicularia juruensis.jpg'],
 ['Avicularia lynnae','Avicularia lynnae 101659159.jpg'],
 ['Avicularia merianae','Avicularia merianae 351588311.jpg'],
 ['Avicularia minatrix','Avicularia minatrix1.jpg'],
 ['Avicularia purpurea','Avicularia purpurea - female - 2014-01-16.JPG'],
 ['Avicularia rufa','Avicularia rufa 250445815.jpg'],
 ['Avicularia taunayi','Avicularia taunayi (10.3897-zookeys.659.10717) Figures 101–104.jpg'],
 ['Avicularia variegata','Avicularia variegata (10.3897-zookeys.659.10717) Figures 58–65.jpg']
];
const favorites=[
 ['Caribena versicolor — підліток','Caribena-versicolor-female-subadult.jpg']
];
function makeCard(name,file){
 const card=document.createElement('figure');card.className='av-spider-card';
 const src='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file)+'?width=650';
 const image=document.createElement('img');image.loading='lazy';image.decoding='async';image.alt=name;
 image.referrerPolicy='no-referrer';image.src=src;
 image.addEventListener('error',()=>{image.remove();const hint=document.createElement('span');hint.textContent='Фото недоступне. Назва виду збережена';card.prepend(hint);});
 const caption=document.createElement('figcaption');const link=document.createElement('a');link.textContent=name;
 link.href='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file).replace(/%20/g,'_');
 link.target='_blank';link.rel='noopener noreferrer';caption.append(link);
 const source=document.createElement('small');source.textContent='Wikimedia Commons · фото та ліцензія за посиланням';caption.append(source);
 card.append(image,caption);return card;
}
// The 12 recognized species appear in the text list; no gallery for them.
for(const [name,file] of favorites) $('av-favorite-gallery')?.append(makeCard(name,file));
})();
