import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getInputBoxes } from '../src/utils/input-selector';
import { ErgoNodeProvider } from '../src/providers/node/ergoNodeProvider';
import type { ErgoToken } from '../src/models/transaction.types';

const mockGetUnspentBoxesByAddress = vi.fn();

vi.mock('../src/providers/node/ergoNodeProvider', () => {
  return {
    ErgoNodeProvider: vi.fn().mockImplementation(() => {
      return {
        getUnspentBoxesByAddress: mockGetUnspentBoxesByAddress,
      };
    }),
  };
});

const mockNodeResponse = [
  {
    boxId: '78e849d1703f73e874f4fd01b6a21882d34eea56ef2824ba4bde21d85f1ef24a',
    value: '1000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1572967,
    assets: [
      {
        tokenId:
          'b1849f63b3b5817298155abefc4ba105faf9f9466c15aed39df8a06985d1d881',
        amount: '3',
      },
      {
        tokenId:
          '828366f5b477c4acc26665ee62fbbb2b26ae149444e8b0b6f2c82571ec49d38f',
        amount: '3',
      },
    ],
    additionalRegisters: {},
    transactionId:
      'eb2306e8de6a985f5daa5fc4cfd6dda2fcedc21630b6ec9c1c21dd859c0c759d',
    index: 0,
    confirmed: true,
  },
  {
    boxId: '7def62276865032508258da56fe7f6badfaaebedd584aecd116b8ac96db20af1',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1572963,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '2768da8092e16b46f569d667aeb478e769a0cd54941b578a2bc3f67d8c672ecc',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'db53158037266641eb73d99d6a5a63e41a842223dab8847e85b9060763e29c1b',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1572963,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '4983586b813f547929b520bd7f71d25eb2e46d89ddd24bb260a12927c9889bb6',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '7928643e5e820d614324739ed395e3bfc45ad5a0a81e9aeb6df55ced7e14d0ab',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1572963,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '14e6d81876c71ab1df3ba44813976454ee62a6db0d849f0ad7dcabd723ee3162',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '1c1f5eaeddea5b83de9e3d236d66768655a0cd600767d8dcee65789dfa1a8bba',
    value: '8900000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1572470,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '3b89354b4486bb653bc13576099753b43ef77d7ab13a03fb2fb6c08449b17337',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '4a06f753c828f2e823be2c0888a05ea03bd84ac93cbff22e899b8d9f6060b239',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1571003,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'c065142c641aded7a5cc927bb30a34e6918601db0714b56bbd9eeb484b358962',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '508584ea669cd8f21e651dcb4ccf33456909a3af61ad8d581911296237267aa6',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1571003,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '69b8ee95151fd2852dc2662f867023d07784ec55c5b14047b6f86a7e781b54ad',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '11fcb5ed58cafadb3f01c58da98903aae644526db6eded9132dd19258de5c6f5',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1571003,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '667b437d56c0c104c7e70a74273ee3dc30ae57127860f7ccc0f5ce0e9544aa91',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '509758ab05262b720736a3a295df5e8170b418c49a3bdcd7231975709749e97b',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570946,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '01e04267d35e43388d5d71f23db3d04eb99dd641d2d0fa5ab4631d4ae6c1650d',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '9058f5cfd9ddbb72189b32e7956e8d24c036898fe0e7be4d2db86b802127f2ec',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570946,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'e1bd51873ca2e68a8706278e65631ac088debd770bbce4f812d561069098a182',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '717d0565c6606d1be2ec8efffbe181d9b4599c6305a36136fad6b400219545bd',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570944,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '5a5a4fdc9c12ef36ae741e971c7c53cc70a9306d19a91a69c107d4253886158a',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '02be5d98d8781ad1221f8b8c8781982b7f6f422f515e8346bb1f1b8f993ca7db',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570942,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'e46e8e88da69e16c0f580a4510b92965c7bd645b90d0458f0a1496069e1c5bbd',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'd203f29711c644abbd2a6f9fc7a0a1ad186dd97407150d8030cf8b89d1a9391d',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570941,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'cec5929ea05121685e5cdb4761edd1a4ec6465dd7e4b980db3da572c0e866b35',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '8286ab2359f4dfbdcdd3a723cc824542dcad609c24d396895662995eb225ee10',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570941,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'e99070080381e46fe6ee3431a1f4b7213317f1ed39b656d00126053b711f8704',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'e01ae2569bdeec0c732e373e965b9f4bb99c35b2b09a93fb8fc4101a6526a055',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570941,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '918093f8b9f122a44de08b10aece1d1e584dbf37b8291f470eca6e09e9b96b0a',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'b9a7124dd076d2fc72b6cf6439884e3e7f333ae18ea238c1e68f6f1bf0e83ae1',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570940,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'a1e357a31c412d056892dec282affcb8655b0b9985e195797e5e9599beae39ee',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '52f8cc5b80bbb65ed2bee784b3f28072da82aa17159a0ee9b9ab4645ffded3a6',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570935,
    assets: [
      {
        tokenId:
          'b33579d3e6c3191b5eaf7b9119798356f63e72d27fbe77d8a1f30670fe60a43f',
        amount: '3',
      },
    ],
    additionalRegisters: {},
    transactionId:
      '1fe37278c393412537d6038ffc3a2f40ed0a7b06c83bf29041824577ee24f020',
    index: 3,
    confirmed: true,
  },
  {
    boxId: '487fbd5768e4b3babf623b2efa44621a4c329fbba5ffe097afc5654d72dd9818',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570935,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '1fe37278c393412537d6038ffc3a2f40ed0a7b06c83bf29041824577ee24f020',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'd9e08c165e9d95b527b4cae93f0816457a906eb8a9e526cc80fc948dafbdfb5b',
    value: '100000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570935,
    assets: [
      {
        tokenId:
          '2cd0ace46adfcf963e01ef5f9767992c02e0dd3b4386387e91e3a1b62180999d',
        amount: '2',
      },
    ],
    additionalRegisters: {},
    transactionId:
      '1fe37278c393412537d6038ffc3a2f40ed0a7b06c83bf29041824577ee24f020',
    index: 0,
    confirmed: true,
  },
  {
    boxId: 'b11276194ad22142e4b98de2e9fd9831ca512140d8dc5c20799d6bbd83c51ad2',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570924,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'ebb9b4b6769810ab7b08b96e6dcbad4ef00d3551d41a72305e98b33b7fb7b49c',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'c5419ac67ad24581581777c786767de1d08ad2edd3fdfd381934f718a57b50b4',
    value: '899900000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570924,
    assets: [
      {
        tokenId:
          'bce090d4b77544f5f1b3952c800a6c92ae403ff8664345b407b88155f224572f',
        amount: '2',
      },
    ],
    additionalRegisters: {},
    transactionId:
      '8d33c0ccfbadd5b36e2fb9bce50de6a5abd0673a621dfa9fe108662b81753f5f',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '14cad68e1fe55722117a34808aeac5211f8ce1eeb024f3eb1e37e21085716d54',
    value: '26900000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570916,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'db8f309d9e15cdbe372b5a53ae7eb80787cb7316f95f13dae38118d0ca0484e8',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '426b9c8426621f20a28e160488ba2957e16a3cd7903c2c8b7407d55d352f26ed',
    value: '2000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570916,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'db8f309d9e15cdbe372b5a53ae7eb80787cb7316f95f13dae38118d0ca0484e8',
    index: 0,
    confirmed: true,
  },
  {
    boxId: '37f82eaecdb767d82f034acf5ca374b1ec60c8910ad8e56823e39852852f0d5a',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570916,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'f14322dc54d9f6cf08b75cdd4ea2e610292652e4ed6a200abbecab8735f52394',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '7f3a3d283ae81a98e97dfc0b1cc9b4f91703e221d222eeb2face4f89d6b908d3',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570915,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'ee32e1fd098eecc33df5c1b9b25a6d48b2e6f841beb3ad3486c83140548b836a',
    index: 2,
    confirmed: true,
  },
  {
    boxId: 'a74f777052f8ae9459e6f707044c65988357c7916b49037474c825571604b1ce',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570347,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'a180bb4e11e27a0f849ad3ad589d90060500fd904278ea6b2db0cdb49363d700',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'f742de3d3f374946da13c32794a976505ca22c3beb355df0dba5a9605b8621c5',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570347,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '34422a6c2661556727207244c363252d00ebe73c479a19636ab2f58a88101367',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'dfd3bf33cc62a625b12e6b3e123ea72f6f7c7e6f45814070c3980e3e1a109eb6',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570347,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '6041725ce45d236fe2c34b71b0b071230b621e20826c8197fa105d5cdc491524',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '67c36c9ad1deccd12fde6ce9be72b93269e8873dfcc81c337836a832c74c0f3d',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570347,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'ec025eefb6ade1760936206e7438e6ea47fa6480d7ac0aa1c9d196699f910c6b',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'd54552e9f586906bb5ee7aa6d28d1fba1f088b21475261da9dc1c9d6143c56fd',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570347,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'a63bdd23123f06d412e253cf398564dc92844748f9b711d45c34f10a89d7d013',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '907b1efcf73b45af987a2e79e1eb54c156a3ce967962d683bab4018b9b5f26b5',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570347,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'd0c196b7f9bfe844cb559c6a7d19ca8a3f519b5368cdf584fdaa941375502e6d',
    index: 2,
    confirmed: true,
  },
  {
    boxId: 'aff125f2ca4bf92441eb2a8235f99f8f4dfa22534bf4d5ddaced32e0c2e53cf9',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570295,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'b4d6e3917d18e1591b1959f66d33aeb73924dd35203cbebc545e8e58279dc18b',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'd673c1d4b43128973f443e6797b4ea18533a5288db6edf84a1baa4fd9f207ce8',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1570293,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '436f1080356215c02a30a851c0c1cceda1a1c3a65f786e9af8fee60ddebf6404',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '3b13cbdcf0958123b3cc14eba12722d23f2ee8065d929396c5985725ca0932f5',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569750,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'f885ebc25e29df1ae07a867c92c0663eb5bed3ca61f018dbb602fbedbef59987',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '08181f2b5c6fc7d5ec4913b82fc1798f6cdce94bf77fe6345e3beba25cf5c2fa',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569746,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '6e79e7a4b77c66617f9d013cd968e4f328f5b22202a50ca32b2317a061f32089',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '560d989e9071c3e2082c8ad666a20aa9e95167c8cf8c4b6cb2c1ff9994d79144',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569743,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '539c227a732d414f5d01a58225ea00359532fb7c43104fdd1a312c47a2d266c3',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '0c6aa061bf703e62c9dbf66570ac480b3394d7b611ed2d43d467f8fbfe42d9f3',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569743,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '63aea63861ff8775b0641483613d9a2d404dca14d106365025d6fe1d20895a4e',
    index: 2,
    confirmed: true,
  },
  {
    boxId: 'a49f5696a0b3f03e2061d4dea23d7aa701fc092b1f20f43ef2c7a20e21452a92',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569727,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'eb9c2f5f005bf8460f2b5b1be0389fd61aab39c360b2bb71bf71ccb2b4ae3b6e',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '030fbd478f33b3f60a774a2b911c3951f00ebbf58febaee417847b57e63fe28f',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569569,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '31f73160eaa78fc0b1edd92ea65be6cffbd6471e54ac24096298c4473eb615b0',
    index: 2,
    confirmed: true,
  },
  {
    boxId: 'b1f764469d68bd8aaf1c867691c914cffdb41c830efd0db58d8885d4fbb8ff19',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569568,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '304e3a4185c7bc99828f904bab71f9871ed41b06a4dd35a24aa68a577b1e010c',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '4eae10e117b5491d703ddb9e8adbcd96b207fae8ed161ff64c4fe440e2512808',
    value: '201000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1569568,
    assets: [
      {
        tokenId:
          '2cd0ace46adfcf963e01ef5f9767992c02e0dd3b4386387e91e3a1b62180999d',
        amount: '2',
      },
    ],
    additionalRegisters: {},
    transactionId:
      '304e3a4185c7bc99828f904bab71f9871ed41b06a4dd35a24aa68a577b1e010c',
    index: 0,
    confirmed: true,
  },
  {
    boxId: '18ab09acf58d6a4335d0d600d47590b173d4852ed608734df77e11d1e053bdcf',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1568344,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'd5f6ca5c64bce6c13f9687e738b3bffac0fe94f52504a7ff9c84e4515e8a3ca2',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '3adf4101815250f8ba2fb506c673ee36ad34640d17ebd0d231ab4e03113924aa',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1568337,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '46d4b874de11516af35a48cf956196e9eada0371e805922d6404a052a487e593',
    index: 2,
    confirmed: true,
  },
  {
    boxId: '7bba415ca9595f60d465f29c35a904a0858797813ded7cc8fefe267f2cf1fad3',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1568301,
    assets: [],
    additionalRegisters: {},
    transactionId:
      'db4cb0012911ebcc5dbadf587e10ba1339bb2d94129dc7656acb807c9ee4f2ab',
    index: 1,
    confirmed: true,
  },
  {
    boxId: '6f04438bf3ca2a7ee1537c82898d02fe6d7c3f8eeb57455a0f0cf2268c301292',
    value: '100000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1568301,
    assets: [
      {
        tokenId:
          '2cd0ace46adfcf963e01ef5f9767992c02e0dd3b4386387e91e3a1b62180999d',
        amount: '4',
      },
    ],
    additionalRegisters: {},
    transactionId:
      'db4cb0012911ebcc5dbadf587e10ba1339bb2d94129dc7656acb807c9ee4f2ab',
    index: 0,
    confirmed: true,
  },
  {
    boxId: '2acbdaf066e0006deffdca2a237f47437e2c96d75a67333a02bbf0e8a68a9660',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1568290,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '2ddb5bcc11794ca9358a01f8b5febafd48479f9549a1d97fc70d4ae25609c351',
    index: 1,
    confirmed: true,
  },
  {
    boxId: 'a923210852a9035cb1bc3994c1b7c539e8f31daf0aa8660a463213d95d6b893d',
    value: '100000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1568290,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '2ddb5bcc11794ca9358a01f8b5febafd48479f9549a1d97fc70d4ae25609c351',
    index: 0,
    confirmed: true,
  },
  {
    boxId: '3c1d1567c45f399343e9242252f6b632b1ac1446c30899e83f885532fd9638b1',
    value: '10000000',
    ergoTree:
      '0008cd0219de7e3550ddd6403a2e4f136bfa2b22f878e863b44838a76da3e987a416b0a0',
    creationHeight: 1568207,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '454b841aeb0f896d50ce22e49e9b6dbfd089f1f7aa60b970633f17f90e02be75',
    index: 1,
    confirmed: true,
  },
];

describe('getInputBoxes', () => {
  let mockNodeProvider: ErgoNodeProvider;

  beforeEach(() => {
    mockNodeProvider = new (ErgoNodeProvider as any)({
      url: 'http://mock.node',
    });

    // vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect change box is needed, thus the total input value should be greater than target', async () => {
    const inputAddresses = [
      '9eiTJkLo4CjFgp7eC9mgcJ1DpcENubWshZAASQZWzNEwpQKBJr2',
    ];
    const targetNanoErgs = 1000000n;
    const requestedTokens: ErgoToken[] = [
      {
        tokenId:
          'b1849f63b3b5817298155abefc4ba105faf9f9466c15aed39df8a06985d1d881',
        amount: 1n,
      },
    ];

    mockGetUnspentBoxesByAddress.mockResolvedValue(mockNodeResponse);

    const selectedBoxes = await getInputBoxes(
      mockNodeProvider,
      inputAddresses,
      targetNanoErgs,
      requestedTokens,
    );

    const totalInputValue = selectedBoxes.reduce(
      (acc, box) => acc + BigInt(box.value),
      0n,
    );

    console.log(totalInputValue);

    expect(totalInputValue).toBeGreaterThan(targetNanoErgs);
    // expect(selectedBoxes.length).toBe(3);
  });
});
