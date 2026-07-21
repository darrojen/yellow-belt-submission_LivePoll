#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec};

fn setup(env: &Env) -> (Address, PollContractClient) {
    let contract_id = env.register(PollContract, ());
    (contract_id.clone(), PollContractClient::new(env, &contract_id))
}

#[test]
fn initialize_and_vote() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let voter = Address::generate(&env);

    let question = String::from_str(&env, "Best Stellar wallet?");
    let options = vec![
        &env,
        String::from_str(&env, "Freighter"),
        String::from_str(&env, "xBull"),
    ];

    client.initialize(&admin, &question, &options);

    assert_eq!(client.get_question(), question);
    assert_eq!(client.get_results(), vec![&env, 0u32, 0u32]);

    let new_count = client.vote(&voter, &0);
    assert_eq!(new_count, 1);
    assert_eq!(client.get_results(), vec![&env, 1u32, 0u32]);
    assert!(client.has_voted(&voter));
}

#[test]
fn cannot_vote_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let voter = Address::generate(&env);
    let question = String::from_str(&env, "Q");
    let options = vec![&env, String::from_str(&env, "A"), String::from_str(&env, "B")];

    client.initialize(&admin, &question, &options);
    client.vote(&voter, &0);

    let result = client.try_vote(&voter, &0);
    assert_eq!(result, Err(Ok(Error::AlreadyVoted)));
}

#[test]
fn rejects_invalid_option() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let voter = Address::generate(&env);
    let question = String::from_str(&env, "Q");
    let options = vec![&env, String::from_str(&env, "A")];

    client.initialize(&admin, &question, &options);

    let result = client.try_vote(&voter, &5);
    assert_eq!(result, Err(Ok(Error::InvalidOption)));
}

#[test]
fn cannot_initialize_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let question = String::from_str(&env, "Q");
    let options = vec![&env, String::from_str(&env, "A"), String::from_str(&env, "B")];

    client.initialize(&admin, &question, &options);
    let result = client.try_initialize(&admin, &question, &options);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}
