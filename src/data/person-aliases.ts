/**
 * Two published names of one person, the earlier first, joined by hand review.
 * No reason for a change of name is recorded.
 */
export type PersonAlias = readonly [earlier: string, later: string]

export const PERSON_ALIASES: readonly PersonAlias[] = [
  ['Andrews, Dexter J', 'Andrews, Jade L'],
  ['Arnot-Copenhaver, Roxanne', "O'Neill, Roxanne"],
  ['Bengtson, Carla', 'Bengtson, Mary C'],
  ['Bentz, Ann H', 'Herz, Ann K'],
  ['Bradley, Autumn L', 'Lorraine, Autumn'],
  ['Bramhall, Ronnie C', 'Bramhall, Ronald C'],
  ['Chang, Tse Chun', 'Chang, James T'],
  ['Cooper, Michelle L', 'Cooper, Shelly L'],
  ['Curiel, Candelaria', 'Erspamer, Candelaria C'],
  ['Devi, Anita', 'Karan, Anita'],
  ['Dewey, Patricia M', 'Lambert, Patricia D'],
  ['Fahrney, Bruce D', 'Fahrney, Piper B'],
  ['Gamble, Chelsea R', 'Hoffmann, Chelsea G'],
  ['Grose, Mike D', 'Grose, Michael D'],
  ['Hansen, Jayde', 'Hansen Thomas, Jayde'],
  ['Helmick, Geordi N', 'Allred, Geordi H'],
  ['Hinojosa, Alyssa C', 'Williams, Alyssa H'],
  ['Irvin, Phillip S', 'Irvin, P. S'],
  ['Jacobson, Kelly N', 'Tomlinson, Kelly J'],
  ['Jenkins, Wiley D', 'Jenkins, Charlotte A'],
  ['Keene, Alexander C', 'Keene, Talia C'],
  ['Kulluson, Jenna R', 'Penny, Jenna K'],
  ['Kuzmin, Maria G', 'Heider, Maria L'],
  ['Lorraine, Autumn', 'Paparo, Autumn L'],
  ['Lujin, Christina', 'Ochs, Christina'],
  ['Macha, Janet E', 'Kneller, Janet M'],
  ['McCrea, Ashley H', 'Dougherty, Ashley M'],
  ['McDowell, Daniel', 'McDowell, Chloe R'],
  ['Murphy, Megan P', 'Lopez, Megan M'],
  ['Murthy, N N', 'Murthy, Nagesh N'],
  ['Myers, Connor E', 'Myers, Nora A'],
  ['Najjar, Michael J', 'Najjar, Malek J'],
  ['Owens, Kelly F', 'Fondren, Kelly M'],
  ['Pena, Maria', 'Gomez De Pena, Maria'],
  ['Perez, Pedro', 'Perez Perez, Pedro'],
  ['Peyralans, Luke C', 'Peyralans, Christopher L'],
  ['Pratt, Janea D', 'Pratt, Nena K'],
  ['Quirke, Douglas J', 'Quirke, J Douglas'],
  ['Samuels, Breah W', 'Little, Breah S'],
  ['Shill, Melissa A', 'Shill, Adam R'],
  ['Silva Rivera, Rebeca', 'Silva, Rebeca R'],
  ['Simoes, Jessica W', 'Johnson, Jessica S'],
  ['Smith, Hollie M', 'Smith, Hollie S'],
  ['Wilson, Emmett R', 'Wilson, Emma R'],
  ['Wilson, Sylena M', 'Wilson, Sylas M'],
  ['Winn, Brad', 'Winn, Bradley'],
  ['Wood, Michelle', 'Wood, Anne M'],
]

/** Name pairs a hand review found to be different people, the earlier first. */
export const DISTINCT_PEOPLE: readonly PersonAlias[] = [
  ['Murray, Andrew P', 'Murray, Andrew M'],
  ['Osborne, Thomas S', 'Osborne, Thomas A'],
  ['Williams, Patrick R', 'Williams, Patrick D'],
]
