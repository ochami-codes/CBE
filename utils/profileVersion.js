export const bumpProfileVersionTx = async (
  client,
  profileId
) => {
  return client.query(
    `UPDATE profiles
     SET profile_state_version = profile_state_version + 1
     WHERE id = $1`,
    [profileId]
  );
};
