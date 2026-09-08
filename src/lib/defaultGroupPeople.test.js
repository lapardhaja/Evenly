import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultPeopleMapForNewGroup,
  preferredSelfPersonName,
  isHandleLikePersonName,
  personDisplayName,
  personRowCaption,
  relabelPeopleForDisplay,
  relabelSelfPeopleMap,
} from './defaultGroupPeople.js';

const handleUser = {
  id: 'user-1',
  email: 'servetlap29@gmail.com',
  user_metadata: { username: 'servetlap29' },
};

describe('defaultGroupPeople', () => {
  it('seeds local-only groups as Me with no linked account', () => {
    const people = Object.values(getDefaultPeopleMapForNewGroup(null));
    assert.equal(people.length, 1);
    assert.equal(people[0].name, 'Me');
    assert.equal(people[0].linkedUserId, undefined);
  });

  it('does not seed a signed-in user as their username or email handle', () => {
    const people = Object.values(getDefaultPeopleMapForNewGroup(handleUser));
    assert.equal(people[0].linkedUserId, 'user-1');
    assert.equal(people[0].name, 'Me');
    assert.notEqual(people[0].name, 'servetlap29');
  });

  it('uses a real first + last name when metadata has one', () => {
    const user = {
      id: 'user-1',
      email: 'servetlap29@gmail.com',
      user_metadata: {
        username: 'servetlap29',
        first_name: 'Servet',
        last_name: 'Lapardhaja',
      },
    };
    assert.equal(preferredSelfPersonName(user), 'Servet Lapardhaja');
    const people = Object.values(getDefaultPeopleMapForNewGroup(user));
    assert.equal(people[0].name, 'Servet Lapardhaja');
  });

  it('treats username, email, and email handle as handle-like names', () => {
    assert.equal(isHandleLikePersonName('servetlap29', handleUser), true);
    assert.equal(isHandleLikePersonName('servetlap29@gmail.com', handleUser), true);
    assert.equal(isHandleLikePersonName('Me', handleUser), false);
    assert.equal(isHandleLikePersonName('Dad', handleUser), false);
  });

  it('relabels an existing self row that stored a username', () => {
    const people = [
      { id: 'p1', name: 'servetlap29', linkedUserId: 'user-1' },
      { id: 'p2', name: 'Alice', linkedUserId: 'friend-9' },
    ];
    const labeled = relabelPeopleForDisplay(people, handleUser);
    assert.equal(labeled[0].name, 'Me');
    assert.equal(labeled[1].name, 'Alice');
    assert.equal(personDisplayName(people[0], handleUser), 'Me');
    assert.equal(personRowCaption(people[0], handleUser.id), 'You');
    assert.equal(personRowCaption(people[1], handleUser.id), 'Friend account');
  });

  it('rewrites a stored people map when the self row is a username', () => {
    const map = {
      p1: { name: 'servetlap29', linkedUserId: 'user-1' },
      p2: { name: 'Alice' },
    };
    const next = relabelSelfPeopleMap(map, handleUser);
    assert.notEqual(next, map);
    assert.equal(next.p1.name, 'Me');
    assert.equal(next.p2.name, 'Alice');
    assert.equal(relabelSelfPeopleMap(next, handleUser), next);
  });

  it('keeps a custom self name that is not a handle', () => {
    const person = { id: 'p1', name: 'Dad', linkedUserId: 'user-1' };
    assert.equal(personDisplayName(person, handleUser), 'Dad');
  });
});
